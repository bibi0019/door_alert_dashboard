import { insertEvent, getEvents, getEventsByTimeRange, getStats, type DoorEventInput } from "./db";
import { sendDiscordNotification } from "./discord";

const API_KEY = process.env.API_KEY || "your-secret-api-key-change-this";
const PORT = process.env.PORT || 3000;

// API Key authentication middleware
function requireApiKey(req: Request): boolean {
  const apiKey = req.headers.get("X-API-Key");
  return apiKey === API_KEY;
}


const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("./public/index.html");
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    if (url.pathname === "/style.css") {
      const file = Bun.file("./public/style.css");
      return new Response(file, {
        headers: { "Content-Type": "text/css" },
      });
    }
    
    if (url.pathname === "/app.js") {
      const file = Bun.file("./public/app.js");
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // API Routes
    if (url.pathname === "/api/events" && req.method === "POST") {
      // Require API key for POST
      if (!requireApiKey(req)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid API Key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      try {
        const body = await req.json() as DoorEventInput;
        
        if (!body.status || !["open", "closed"].includes(body.status)) {
          return new Response(
            JSON.stringify({ error: "Invalid status. Must be 'open' or 'closed'" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const event = insertEvent(body.status);
        
        if (event === null) {
          return new Response(
            JSON.stringify({ message: "Status unchanged, no event created" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        
        sendDiscordNotification(event.status, event.timestamp);

        return new Response(JSON.stringify(event), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Invalid request body" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    if (url.pathname === "/api/events" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");

      let events;
      if (from && to) {
        events = getEventsByTimeRange(parseInt(from), parseInt(to));
      } else {
        events = getEvents(limit, offset);
      }

      return new Response(JSON.stringify(events), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/stats" && req.method === "GET") {
      const stats = getStats();
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 404 for unknown routes
    return new Response("Not Found", { 
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  },
});

console.log(`Door Alert Dashboard server running at http://localhost:${server.port}`);
console.log(`Dashboard: http://localhost:${server.port}`);
console.log(`API Key required for POST /api/events: ${API_KEY}`);
