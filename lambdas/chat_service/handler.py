import json
import boto3
import os
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
CONNECTIONS_TABLE = os.environ["CONNECTIONS_TABLE"]
WS_ENDPOINT       = os.environ["WS_ENDPOINT"]

apigw = boto3.client("apigatewaymanagementapi", endpoint_url=WS_ENDPOINT)


def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    body = json.loads(event.get("body") or "{}")

    message = body.get("message", "").strip()
    if not message:
        return {"statusCode": 400, "body": "message is required"}
    if len(message) > 300:
        return {"statusCode": 400, "body": "message too long (max 300 chars)"}

    conn_table = dynamodb.Table(CONNECTIONS_TABLE)
    result = conn_table.get_item(Key={"connectionId": connection_id})
    item = result.get("Item", {})

    room_id = item.get("roomId")
    player_id = item.get("playerId")

    if not room_id:
        return {"statusCode": 400, "body": "You are not in a room"}

    payload = json.dumps({
        "type":      "CHAT",
        "playerId":  player_id,
        "message":   message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }).encode()

    connections = _get_room_connections(room_id)
    for cid in connections:
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            dynamodb.Table(CONNECTIONS_TABLE).delete_item(
                Key={"connectionId": cid}
            )

    return {"statusCode": 200, "body": "Message sent"}


def _get_room_connections(room_id):
    conn_table = dynamodb.Table(CONNECTIONS_TABLE)
    result = conn_table.query(
        IndexName="roomId-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("roomId").eq(room_id),
    )
    return [item["connectionId"] for item in result.get("Items", [])]
