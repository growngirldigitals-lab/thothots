const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

client.once("ready", () => {
  console.log(`Thot Thots Sales Tracker online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const text = message.content.trim();

  // Only recognize order posts
  if (
    !/name\s*:/i.test(text) ||
    !/amount\s*:/i.test(text) ||
    !/price\s*:/i.test(text)
  ) return;

  try {
    const match = text.match(
      /name\s*:\s*(.+?)\s+amount\s*:\s*(\d+)\s+(.+?)\s+price\s*:\s*\$?([\d,.]+)\s*([kKmM])?/i
    );

    if (!match) {
      console.log("Order format not recognized:", text);
      return;
    }

    const customer = match[1].trim();
    const quantity = parseInt(match[2].replace(/,/g, ""), 10);
    const item = match[3].trim();

    let price = parseFloat(match[4].replace(/,/g, ""));
    const suffix = match[5]?.toLowerCase();

    if (suffix === "k") price *= 1000;
    if (suffix === "m") price *= 1000000;

    const order = {
      employee: message.member?.displayName || message.author.username,
      customer,
      item,
      quantity,
      price,
      messageId: message.id
    };

    const response = await fetch(GOOGLE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(order)
    });

    const result = await response.json();

    if (result.success) {
      await message.react("✅");
      console.log("Order successfully logged:", order);
    } else {
      await message.react("❌");
      console.error("Google rejected order:", result);
    }

  } catch (error) {
    console.error("Order tracking error:", error);

    try {
      await message.react("❌");
    } catch {}
  }
});

client.login(TOKEN);
