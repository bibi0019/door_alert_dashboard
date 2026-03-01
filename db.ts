import { Database } from "bun:sqlite";

// Initialize SQLite database
const db = new Database("door_alerts.db", { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS door_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
    timestamp INTEGER NOT NULL
  )
`);


export interface DoorEvent {
  id: number;
  status: "open" | "closed";
  timestamp: number;
}

export interface DoorEventInput {
  status: "open" | "closed";
}

export function getLastEventStatus(): "open" | "closed" | null {
  const query = db.query<DoorEvent, []>(
    "SELECT id, status, timestamp FROM door_events ORDER BY timestamp DESC LIMIT 1"
  );
  const lastEvent = query.get();
  return lastEvent?.status || null;
}

export function insertEvent(status: "open" | "closed"): DoorEvent | null {
  const lastStatus = getLastEventStatus();
  
  // Don't insert if status hasn't changed
  if (lastStatus === status) {
    return null;
  }
  
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO door_events (status, timestamp) VALUES (?, ?)",
    [status, timestamp]
  );
  
  return {
    id: result.lastInsertRowid as number,
    status,
    timestamp,
  };
}

export function getEvents(limit = 100, offset = 0): DoorEvent[] {
  const query = db.query<DoorEvent, [number, number]>(
    "SELECT id, status, timestamp FROM door_events ORDER BY timestamp DESC LIMIT ? OFFSET ?"
  );
  return query.all(limit, offset);
}

export function getEventsByTimeRange(from: number, to: number): DoorEvent[] {
  const query = db.query<DoorEvent, [number, number]>(
    "SELECT id, status, timestamp FROM door_events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC"
  );
  return query.all(from, to);
}

export function getStats() {
  const totalQuery = db.query<{ count: number }, []>(
    "SELECT COUNT(*) as count FROM door_events"
  );
  const total = totalQuery.get()?.count || 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayQuery = db.query<{ count: number }, [number]>(
    "SELECT COUNT(*) as count FROM door_events WHERE timestamp >= ?"
  );
  const todayCount = todayQuery.get(todayStart.getTime())?.count || 0;

  const lastEventQuery = db.query<DoorEvent, []>(
    "SELECT id, status, timestamp FROM door_events ORDER BY timestamp DESC LIMIT 1"
  );
  const lastEvent = lastEventQuery.get();

  return {
    totalEvents: total,
    todayEvents: todayCount,
    currentStatus: lastEvent?.status || "unknown",
    lastUpdate: lastEvent?.timestamp || null,
  };
}

export default db;
