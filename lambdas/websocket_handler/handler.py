import json
import logging
import traceback

import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
CONNECTIONS_TABLE = os.environ["CONNECTIONS_TABLE"]
ROOMS_TABLE       = os.environ["ROOMS_TABLE"]
WS_ENDPOINT       = os.environ["WS_ENDPOINT"]

apigw = boto3.client("apigatewaymanagementapi", endpoint_url=WS_ENDPOINT)


def lambda_handler(event, context):
    route = event["requestContext"]["routeKey"]
    connection_id = event["requestContext"]["connectionId"]
    logger.info("route=%s connection=%s", route, connection_id)

    try:
        if route == "$connect":
            return handle_connect(event, connection_id)
        elif route == "$disconnect":
            return handle_disconnect(connection_id)
        elif route == "joinRoom":
            return handle_join_room(event, connection_id)
        else:
            logger.warning("Unknown route: %s", route)
            return {"statusCode": 400, "body": "Unknown route"}
    except Exception:
        logger.error("Unhandled exception:\n%s", traceback.format_exc())
        _safe_send(connection_id, {
            "type": "ERROR",
            "error": "Internal server error in WebSocket handler",
        })
        return {"statusCode": 500, "body": "Internal error"}


def handle_connect(event, connection_id):
    table = dynamodb.Table(CONNECTIONS_TABLE)
    table.put_item(Item={"connectionId": connection_id})
    logger.info("Connected: %s", connection_id)
    return {"statusCode": 200, "body": "Connected"}


def handle_disconnect(connection_id):
    conn_table = dynamodb.Table(CONNECTIONS_TABLE)

    result = conn_table.get_item(Key={"connectionId": connection_id})
    item = result.get("Item", {})
    room_id = item.get("roomId")
    player_id = item.get("playerId")

    logger.info("Disconnect: connection=%s room=%s player=%s", connection_id, room_id, player_id)

    if room_id:
        _broadcast(room_id, connection_id, {
            "type":         "PLAYER_LEFT",
            "connectionId": connection_id,
            "playerId":     player_id,
            "roomId":       room_id,
        })

    conn_table.delete_item(Key={"connectionId": connection_id})
    return {"statusCode": 200, "body": "Disconnected"}


def handle_join_room(event, connection_id):
    body = json.loads(event.get("body") or "{}")
    room_id = body.get("roomId")
    player_id = body.get("playerId")
    player_token = body.get("playerToken")

    logger.info("joinRoom: connection=%s room=%s player=%s token_present=%s",
                connection_id, room_id, player_id, bool(player_token))

    if not room_id or not player_id or not player_token:
        msg = "roomId, playerId, and playerToken are all required"
        logger.warning("joinRoom rejected: missing fields")
        _safe_send(connection_id, {"type": "ROOM_JOIN_ERROR", "error": msg})
        return {"statusCode": 400, "body": msg}

    rooms_table = dynamodb.Table(ROOMS_TABLE)
    result = rooms_table.get_item(Key={"roomId": room_id})
    room = result.get("Item")
    if not room:
        msg = f"Room {room_id} not found"
        logger.warning("joinRoom rejected: %s", msg)
        _safe_send(connection_id, {"type": "ROOM_JOIN_ERROR", "error": msg})
        return {"statusCode": 404, "body": msg}

    if not _player_belongs_to_room(room, player_id, player_token):
        msg = "Invalid player credentials for this room"
        logger.warning("joinRoom rejected: credentials mismatch for player=%s in room=%s (room has %d players)",
                       player_id, room_id, len(room.get("players", [])))
        _safe_send(connection_id, {"type": "ROOM_JOIN_ERROR", "error": msg})
        return {"statusCode": 403, "body": msg}

    conn_table = dynamodb.Table(CONNECTIONS_TABLE)
    current_connection = conn_table.get_item(Key={"connectionId": connection_id}).get("Item", {})
    existing_player_connections = _get_player_connection_ids(room_id, player_id, exclude_connection_id=connection_id)
    is_same_connection_rejoin = (
        current_connection.get("roomId") == room_id and current_connection.get("playerId") == player_id
    )

    logger.info("joinRoom: existing_connections=%d same_rejoin=%s",
                len(existing_player_connections), is_same_connection_rejoin)

    for existing_connection_id in existing_player_connections:
        _evict_connection(existing_connection_id)

    conn_table.update_item(
        Key={"connectionId": connection_id},
        UpdateExpression="SET roomId = :r, playerId = :p",
        ExpressionAttributeValues={":r": room_id, ":p": player_id},
    )

    reconnected = bool(is_same_connection_rejoin or existing_player_connections)
    logger.info("joinRoom: sending ROOM_JOINED to %s (reconnected=%s)", connection_id, reconnected)

    _safe_send(connection_id, {
        "type": "ROOM_JOINED",
        "roomId": room_id,
        "playerId": player_id,
        "reconnected": reconnected,
    })

    if not reconnected:
        _broadcast(room_id, None, {
            "type":     "PLAYER_JOINED",
            "playerId": player_id,
            "roomId":   room_id,
        })

    return {"statusCode": 200, "body": "Joined room"}


def _get_room_connections(room_id):
    return [item["connectionId"] for item in _get_room_connection_items(room_id)]


def _get_room_connection_items(room_id):
    conn_table = dynamodb.Table(CONNECTIONS_TABLE)
    result = conn_table.query(
        IndexName="roomId-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("roomId").eq(room_id),
    )
    return result.get("Items", [])


def _broadcast(room_id, exclude_connection_id, message):
    connections = _get_room_connections(room_id)
    payload = json.dumps(message).encode()

    for cid in connections:
        if cid == exclude_connection_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            dynamodb.Table(CONNECTIONS_TABLE).delete_item(Key={"connectionId": cid})
        except Exception:
            logger.error("broadcast send failed for connection=%s:\n%s", cid, traceback.format_exc())


def _player_belongs_to_room(room, player_id, player_token):
    for player in room.get("players", []):
        if player.get("playerId") == player_id and player.get("playerToken") == player_token:
            return True
    return False


def _get_player_connection_ids(room_id, player_id, exclude_connection_id):
    conn_table = dynamodb.Table(CONNECTIONS_TABLE)
    connection_ids = []

    for item in _get_room_connection_items(room_id):
        existing_connection_id = item["connectionId"]
        if existing_connection_id == exclude_connection_id:
            continue

        existing_connection = conn_table.get_item(Key={"connectionId": existing_connection_id}).get("Item", {})
        if existing_connection.get("playerId") == player_id:
            connection_ids.append(existing_connection_id)

    return connection_ids


def _evict_connection(connection_id):
    try:
        apigw.delete_connection(ConnectionId=connection_id)
    except apigw.exceptions.GoneException:
        pass
    except Exception:
        logger.error("evict failed for connection=%s:\n%s", connection_id, traceback.format_exc())

    dynamodb.Table(CONNECTIONS_TABLE).delete_item(Key={"connectionId": connection_id})


def _safe_send(connection_id, message):
    payload = json.dumps(message).encode()
    try:
        apigw.post_to_connection(ConnectionId=connection_id, Data=payload)
        logger.info("Sent %s to %s", message.get("type", "?"), connection_id)
    except apigw.exceptions.GoneException:
        logger.warning("Connection %s is gone, cannot send %s", connection_id, message.get("type", "?"))
        dynamodb.Table(CONNECTIONS_TABLE).delete_item(Key={"connectionId": connection_id})
    except Exception:
        logger.error("Failed to send %s to %s:\n%s", message.get("type", "?"), connection_id, traceback.format_exc())
