# Door Alert Dashboard

Real-time door monitoring dashboard: a micro:bit detects door open/close, an ESP32 forwards events to this server, and a web UI shows status + history.

## Features

- Live status (open/closed) + “last updated”
- Recent activity table
- 24h activity chart (Chart.js)
- SQLite Database (Bun’s native `bun:sqlite`)
- Optional Discord webhook notifications
- API key required for event ingestion (`POST /api/events`)

## Architecture

- **micro:bit**: detects door status (open/closed)
- **ESP32**: receives UART from micro:bit and sends HTTP requests to this dashboard
- **Backend**: Bun server + SQLite database (`door_alerts.db`)
- **Frontend**: static HTML/CSS/JS served by the Bun server

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed

### Install

```bash
bun install
```

### Configure

Configure a `.env` file in the project root from `.env.example` file:

### Run

```bash
# Dev / local
bun run dev

# Or
bun run start
```

Open http://localhost:3000

Note: the server binds to `0.0.0.0`, so it can be reachable from other devices on your network.

## Scripts

- `bun run dev` / `bun run start`: start the server
- `bun run reset-db`: delete all rows from the `door_events` table

## Project Structure

```
public/            # Static dashboard UI
  index.html
  style.css
  app.js
etcs/              # Micro:bit code and ESP32 code
  esp32send.ino
  Microbit_code.py
db.ts              # SQLite access + queries
server.ts          # Bun server + API routes
discord.ts         # Optional Discord webhook notifications
reset-db.ts        # Clears the door_events table
```

## API

### Authentication

`POST /api/events` requires an `X-API-Key` header matching `API_KEY` from `.env`.

### POST /api/events

Create a new event.

- Body: `{ "status": "open" | "closed" }`
- Returns `201` with the created event, or `200` with `{ "message": "Status unchanged, no event created" }` if the last stored status is the same.

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-change-this" \
  -d '{"status":"open"}'
```

### GET /api/events

List events (newest first).

Query params:

- `limit` (default `100`)
- `offset` (default `0`)
- `from` and `to` (optional): epoch milliseconds. When both are present, the server returns events in that time range.

```bash
curl "http://localhost:3000/api/events?limit=50"
```

### GET /api/stats

Returns summary stats and the last known status:

```json
{
  "totalEvents": 123,
  "todayEvents": 10,
  "currentStatus": "open",
  "lastUpdate": 1700000000000
}
```

```bash
curl http://localhost:3000/api/stats
```

## Database

- Database file: `door_alerts.db`
- Table: `door_events (id, status, timestamp)` where `timestamp` is epoch milliseconds

To clear all stored events:

```bash
bun run reset-db
```

## Troubleshooting

- **401 Unauthorized** on `POST /api/events`: ensure `X-API-Key` matches `API_KEY` in `.env`.
- **No Discord messages**: set `DISCORD_WEBHOOK_URL` in `.env` (notifications are skipped when unset).

## License

Proof-of-concept project.
