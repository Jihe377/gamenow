# Game Platform — Person A Services

## What's in here

| Service | File | Description |
|---|---|---|
| Room service | `lambdas/room_service/handler.py` | Create rooms, get room info, join rooms |
| WebSocket handler | `lambdas/websocket_handler/handler.py` | Connect/disconnect, join room over WS, broadcast game state |
| Chat service | `lambdas/chat_service/handler.py` | In-room chat messages |
| Battleship service | `lambdas/battleship_service/handler.py` | Place ships, fire shots, and broadcast realtime Battleship state |
| Terraform | `*.tf` in repo root | All AWS infrastructure as code |

---

## Setup

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform installed (`brew install terraform` or https://terraform.io)
- Default AWS region in Terraform is `us-west-2`

### Deploy

```bash
mkdir -p zips          # Terraform writes zip files here
terraform init
terraform apply
```

### Remote state (S3 + DynamoDB lock)

Terraform state is stored in **S3** with a **DynamoDB** lock table so multiple people can run `terraform apply` safely:

| Resource | Purpose |
|---|---|
| S3 bucket `game-platform-terraform-state-<AWS_ACCOUNT_ID>` | Holds `gamenow/terraform.tfstate` |
| DynamoDB `game-platform-terraform-lock` | Prevents concurrent applies |

Configuration lives in `main.tf` (`backend "s3" { ... }`). The bucket is created by `backend_state.tf` using the pattern `${project}-terraform-state-${account_id}`.

**New machine / teammate clone**

1. Configure AWS credentials for the **same** account (same `aws configure` profile or env vars).
2. `terraform init` — pulls state from S3 (no local `terraform.tfstate` in git).
3. `terraform plan` / `terraform apply` as usual.

**If you fork to another AWS account**, create the state bucket and lock table first (run `terraform apply` once with backend commented or use a bootstrap), then update the `bucket` value in `main.tf` to match `terraform output -raw terraform_state_bucket` for that account.

**IAM:** Users need permission to read/write the state object in S3 and acquire/release locks in the DynamoDB table (typical `PowerUser` or a custom policy scoped to those resources).

After `apply` completes, Terraform prints:
- `rest_api_url`   — REST base URL
- `websocket_url`  — WebSocket URL
- `frontend_url`   — Hosted frontend URL (CloudFront)

Source of truth for Lambda code:
- `lambdas/room_service/handler.py`
- `lambdas/websocket_handler/handler.py`
- `lambdas/chat_service/handler.py`
- `lambdas/battleship_service/handler.py`

Static frontend files:
- `frontend/index.html`
- `frontend/app.js`
- `frontend/styles.css`
- `frontend/DESIGN_TOKENS.md` — shared CSS color tokens for all games

Terraform now uploads those files to S3 and serves them through CloudFront.
Deep links such as `/battleship/4821` are configured to fall back to `index.html`, so refreshing a room URL still loads the frontend correctly.

**Share all three URLs with your teammates when needed.**

---

## REST API reference

### POST /rooms
Create a new room.

**Request body:**
```json
{ "gameType": "battleship", "playerName": "Captain Nova" }
```
`gameType` must be `"uno"`, `"battleship"`, or `"chess"`.
`playerName` is the display name shown in room state and the frontend UI.

**Response 201:**
```json
{
  "roomId":   "4821",
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token",
  "playerName": "Captain Nova",
  "hostPlayerId": "uuid-...",
  "gameType": "battleship",
  "status":   "waiting"
}
```

Store `playerToken` on the frontend and send it back when joining the WebSocket.
Waiting rooms are also created with `expiresAt = now + 24h` so DynamoDB TTL can clean up stale rooms that never start.

---

### GET /rooms/{roomId}
Get room info.

**Response 200:**
```json
{
  "roomId":    "4821",
  "gameType":  "battleship",
  "status":    "waiting",
  "hostPlayerId": "uuid-...",
  "hostPlayerName": "Captain Nova",
  "players":   [{ "playerId": "uuid-...", "playerName": "Captain Nova", "joinedAt": "..." }],
  "createdAt": "..."
}
```

`GET /rooms/{roomId}` intentionally does not expose `playerToken`.

---

### POST /rooms/{roomId}/join
Join an existing room.

**Request body:**
```json
{ "playerName": "Commander Atlas" }
```

**Response 200:**
```json
{
  "roomId":   "4821",
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token",
  "playerName": "Commander Atlas",
  "hostPlayerId": "uuid-..."
}
```

---

### POST /rooms/{roomId}/leave
Leave the room yourself, or remove another player if you are the current host.

**Leave yourself:**
```json
{
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token"
}
```

**Host removes another player:**
```json
{
  "playerId": "host-player-id",
  "playerToken": "host-player-token",
  "targetPlayerId": "player-to-remove"
}
```

**Response 200:**
```json
{
  "roomId": "4821",
  "removedPlayerId": "uuid-...",
  "removedPlayerName": "Commander Atlas",
  "hostPlayerId": "uuid-...",
  "hostPlayerName": "Captain Nova",
  "status": "waiting"
}
```

Rules:
- Explicit leave/remove updates `rooms.players`
- WebSocket disconnect by itself does not remove a player from the room
- The host is always the first player in seat order
- If the host leaves, the next player in the list automatically becomes the new host

---

### POST /rooms/{roomId}/start
Host starts the game. Only the host can call this, and all seats must be filled.

**Request body:**
```json
{
  "playerId": "host-player-id",
  "playerToken": "host-player-token"
}
```

**Response 200:**
```json
{
  "roomId": "4821",
  "status": "setup",
  "hostPlayerId": "uuid-..."
}
```

Rules:
- Room must be in `waiting` status with all seats filled
- Only the host can start the game
- Sets room status to `setup` and removes `expiresAt`
- Broadcasts a `ROOM_STARTED` WebSocket event to all connections in the room

---

## Battleship API reference

### GET /battleship/{roomId}?playerId=...&playerToken=...
Get the current Battleship state for one player.

**Response 200:**
```json
{
  "roomId": "4821",
  "phase": "playing",
  "roundNumber": 3,
  "lastResolvedRound": 2,
  "winnerPlayerId": null,
  "hostPlayerId": "uuid-...",
  "hostPlayerName": "Captain Nova",
  "youPlayerId": "uuid-...",
  "youPlayerName": "Commander Atlas",
  "shotSubmittedThisRound": false,
  "waitingForOpponent": false,
  "canFire": true,
  "fleet": [
    { "name": "carrier", "size": 5 },
    { "name": "battleship", "size": 4 }
  ],
  "players": [
    {
      "playerId": "uuid-...",
      "playerName": "Captain Nova",
      "ready": true,
      "seatIndex": 0,
      "isHost": true,
      "submittedShotThisRound": true
    }
  ],
  "currentRound": {
    "yourShot": null,
    "opponentSubmitted": true
  },
  "room": {
    "status": "playing",
    "players": [
      { "playerId": "uuid-...", "playerName": "Captain Nova", "joinedAt": "..." }
    ]
  ],
  "ownBoard": {
    "ships": [],
    "shotsReceived": []
  },
  "opponentBoard": {
    "playerId": null,
    "shotsFired": [],
    "remainingShipCells": null
  }
}
```

### POST /battleship/{roomId}/setup
Lock a player's ship placement.

**Request body:**
```json
{
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token",
  "placements": [
    { "name": "carrier", "startRow": 0, "startCol": 0, "orientation": "horizontal" },
    { "name": "battleship", "startRow": 2, "startCol": 1, "orientation": "vertical" },
    { "name": "cruiser", "startRow": 5, "startCol": 4, "orientation": "horizontal" },
    { "name": "submarine", "startRow": 7, "startCol": 2, "orientation": "vertical" },
    { "name": "destroyer", "startRow": 9, "startCol": 6, "orientation": "horizontal" }
  ]
}
```

### POST /battleship/{roomId}/fire
Submit one shot for the current round.

**Request body:**
```json
{
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token",
  "row": 4,
  "col": 7
}
```

### POST /battleship/{roomId}/forfeit
End the current game and reset the room back to the waiting lobby.

**Request body:**
```json
{
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token"
}
```

**Response 200:**
```json
{
  "roomId": "4821",
  "status": "waiting"
}
```

Rules:
- Any player in the room can forfeit
- Deletes the Battleship game record from DynamoDB
- Resets room status to `waiting` and reinstates a 24-hour `expiresAt` TTL
- Broadcasts a `ROOM_UPDATED` WebSocket event so both players return to the lobby

---

General Battleship rules:
- The Battleship service is authoritative for setup, turns, hits, misses, and winners
- When both players are ready, the room status changes to `playing` and `expiresAt` is removed
- Each round allows at most one submitted shot per player
- The first player to submit waits; the round resolves only after both shots are in
- Resolved enemy shots always appear on the defender's own board
- A player cannot shoot the same cell twice across the match

---

## WebSocket API reference

Connect to: `wss://<websocket_url>`

All messages must include an `"action"` field — this is what API Gateway uses to route to the correct Lambda.

### joinRoom
Tell the server which room and anonymous player you are.
```json
{
  "action": "joinRoom",
  "roomId": "4821",
  "playerId": "uuid-...",
  "playerToken": "temporary-secret-token"
}
```

The frontend should not send `broadcastState`. Final game state must only be sent by server-side game Lambdas after they validate a move.

### sendChat
Send a chat message to everyone in the room.
```json
{ "action": "sendChat", "message": "Good move!" }
```

---

## Messages received by the frontend (server → client)

| type | When sent | Payload |
|---|---|---|
| `ROOM_JOINED` | Your WebSocket successfully joined the room | `{ roomId }` |
| `ROOM_JOIN_ERROR` | WebSocket join validation failed | `{ error }` |
| `PLAYER_JOINED` | Someone joins the room | `{ playerId, roomId }` |
| `PLAYER_LEFT` | Someone disconnects or is explicitly removed | `{ connectionId, playerId, roomId }` |
| `ROOM_STARTED` | Host started the game | `{ roomId, status }` |
| `ROOM_UPDATED` | Room status changed (e.g. forfeit back to waiting) | `{ roomId, status }` |
| `GAME_STATE` | After Battleship setup or a shot | `{ state: { ...viewer-specific battleship state... } }` |
| `CHAT` | Chat message sent | `{ playerId, message, timestamp }` |

---

## DynamoDB tables

### game-platform-rooms
| Key | Type | Description |
|---|---|---|
| `roomId` (PK) | String | 4-digit room code, e.g. `"4821"` |
| `gameType` | String | `"uno"` / `"battleship"` / `"chess"` |
| `status` | String | `"waiting"` / `"playing"` / `"finished"` |
| `hostPlayerId` | Derived | Public room responses expose the current host, which is always the first player in seat order |
| `players` | List | Stored as `{ playerId, playerToken, playerName, joinedAt }`; public APIs return `{ playerId, playerName, joinedAt }` |
| `createdAt` | String | ISO timestamp |
| `expiresAt` | Number | Unix timestamp used by DynamoDB TTL to delete rooms that stay in `waiting` for more than 24 hours |

### game-platform-connections
| Key | Type | Description |
|---|---|---|
| `connectionId` (PK) | String | API Gateway connection ID |
| `roomId` | String | Which room this connection is in |
| `playerId` | String | Which player this connection belongs to |

The connections table also has a `roomId-index` GSI so chat and realtime broadcasts can query all connections in one room without scanning the whole table.

### game-platform-battleship-games
| Key | Type | Description |
|---|---|---|
| `roomId` (PK) | String | Battleship state for one room |
| `phase` | String | `waiting_for_players` / `setup` / `playing` / `finished` |
| `roundNumber` | Number | Current round number while both players can submit one shot each |
| `currentRoundShots` | Map | Pending one-shot-per-player submissions for the current round |
| `playerOrder` | List | Current seat order copied from the room |
| `players` | Map | Per-player setup, ships, shots fired, and shots received |
| `winnerPlayerId` | String | Winning player after the match finishes |

---

## For teammates (B and C)

After Person A deploys, you will get two URLs:
- `REST_API_URL` — use this to call `POST /rooms`, `POST /rooms/{id}/join`, and `POST /rooms/{id}/leave`
- `WS_URL` — connect to this with WebSocket

**Typical flow for your game service:**
1. Frontend calls `POST /rooms` or `POST /rooms/{id}/join` → gets `roomId` + `playerId` + `playerToken`
2. Frontend opens WebSocket → sends `joinRoom` with `playerToken`
3. Battleship players call `POST /battleship/{roomId}/setup` until both are ready
4. Each player submits one shot for the round → your game Lambda validates the move and stores it
5. After both shots are present, your game Lambda resolves the round, updates both boards, and writes the new state
6. Your game Lambda uses `ApiGatewayManagementApi.post_to_connection(...)` to send `GAME_STATE` to each connection in the room

Do not let browsers send final state updates. Clients should only send player actions; server-side Lambdas should compute and broadcast the resulting state.

When a match actually starts, your game Lambda should set `status = "playing"` and remove `expiresAt`; otherwise DynamoDB TTL may still delete the room later because TTL cleanup is based on the presence of that timestamp.

## Frontend demo

You can still serve the frontend locally with:
```bash
python3 -m http.server 4173 --directory frontend
```

For AWS deployment, open the Terraform output `frontend_url`.

Then open either the CloudFront URL or `http://127.0.0.1:4173/` in two browser windows.

The play page hides API configuration by default. Open it by double-clicking the `GameNow` logo or pressing `Ctrl+Shift+C`, then fill in:
- `rest_api_url`
- `websocket_url`

Then:
1. In both windows, enter a player name
2. In window A, click `Create Room`
3. In window B, paste the 4-digit room code and click `Join Room`, or directly open `/battleship/<roomId>`
4. Place ships on each player's board and click `Lock Placement`
5. Once both fleets are locked, each player submits one shot per round
6. The round resolves only after both players have fired

The page restores your saved `roomId`, `playerId`, `playerToken`, and `playerName` after a refresh. Session status shows `saved` until the WebSocket rejoins the room and `connected` after the server confirms the rejoin.
