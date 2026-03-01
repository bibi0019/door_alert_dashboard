import { Database } from "bun:sqlite";

const db = new Database("door_alerts.db");

console.log("Resetting database...");

const result = db.run("DELETE FROM door_events");

console.log(`Deleted ${result.changes} events from the database`);
console.log("Database has been reset successfully");

db.close();