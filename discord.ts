const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordNotification(
  status: "open" | "closed",
  timestamp: number
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    return;
  }

  const isOpen = status === "open";
  //Database stores timestamps in ms, Discord expects seconds
  const time = `<t:${Math.floor(timestamp / 1000)}:F>`;

  const payload = {
    embeds: [
      {
        title: isOpen ? "Door Opened" : "Door Closed",
        color: isOpen ? 0xf59e0b : 0x22c55e,
        fields: [
          {
            name: "Status",
            value: isOpen ? "Open" : "Closed",
            inline: true,
          },
          {
            name: "Time",
            value: time,
            inline: true,
          },
        ],
        timestamp: new Date(timestamp).toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}
