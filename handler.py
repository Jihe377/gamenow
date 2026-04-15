import json
import boto3
import uuid
import os
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
ROOMS_TABLE = os.environ["ROOMS_TABLE"]


def lambda_handler(event, context):
    http_method = event.get("httpMethod", "")
    path = event.get("path", "")

    if http_method == "POST" and path == "/rooms":
        return create_room(event)
    elif http_method == "GET" and path.startswith("/rooms/"):
        room_id = event["pathParameters"]["roomId"]
        return get_room(room_id)
    elif http_method == "POST" and path.endswith("/join"):
        room_id = event["pathParameters"]["roomId"]
        return join_room(event, room_id)
    else:
        return response(404, {"error": "Route not found"})


def create_room(event):
    body = json.loads(event.get("body") or "{}")
    game_type = body.get("gameType")

    if game_type not in ("uno", "battleship", "chess"):
        return response(400, {"error": "gameType must be uno, battleship, or chess"})

    room_id = str(uuid.uuid4())[:8].upper()
    player_id = str(uuid.uuid4())

    table = dynamodb.Table(ROOMS_TABLE)
    table.put_item(Item={
        "roomId":    room_id,
        "gameType":  game_type,
        "status":    "waiting",
        "players":   [{"playerId": player_id, "joinedAt": _now()}],
        "createdAt": _now(),
        "updatedAt": _now(),
    })

    return response(201, {
        "roomId":   room_id,
        "playerId": player_id,
        "gameType": game_type,
        "status":   "waiting",
    })


def get_room(room_id):
    table = dynamodb.Table(ROOMS_TABLE)
    result = table.get_item(Key={"roomId": room_id})
    item = result.get("Item")

    if not item:
        return response(404, {"error": "Room not found"})

    return response(200, item)


def join_room(event, room_id):
    table = dynamodb.Table(ROOMS_TABLE)
    result = table.get_item(Key={"roomId": room_id})
    item = result.get("Item")

    if not item:
        return response(404, {"error": "Room not found"})
    if item["status"] != "waiting":
        return response(400, {"error": "Room is not accepting players"})

    max_players = {"uno": 4, "battleship": 2, "chess": 2}
    if len(item["players"]) >= max_players[item["gameType"]]:
        return response(400, {"error": "Room is full"})

    player_id = str(uuid.uuid4())
    table.update_item(
        Key={"roomId": room_id},
        UpdateExpression="SET players = list_append(players, :p), updatedAt = :t",
        ExpressionAttributeValues={
            ":p": [{"playerId": player_id, "joinedAt": _now()}],
            ":t": _now(),
        },
    )

    return response(200, {"roomId": room_id, "playerId": player_id})


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def _now():
    return datetime.now(timezone.utc).isoformat()
