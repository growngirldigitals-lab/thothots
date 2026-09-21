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

  // Must contain the 3 required order fields
  if (
    !/name\s*:/i.test(text) ||
    !/amount\s*:/i.test(text) ||
    !/price\s*:/i.test(text)
  ) {
    return;
  }

  try {
    // Pull each field separately so formatting can be flexible
    const nameMatch = text.match(
      /name\s*:\s*(.+?)(?=\s+amount\s*:|\n|$)/i
    );

    const amountMatch = text.match(
      /amount\s*:\s*(\d[\d,]*)(?:\s+(.+?))?(?=\s+price\s*:|\n|$)/i
    );

    const priceMatch = text.match(
      /price\s*:\s*\$?\s*([\d,.]+)\s*([kKmM])?/i
    );

    if (!nameMatch || !amountMatch || !priceMatch) {
      console.log("Order format not recognized:", text);
      return;
    }

    const customer = nameMatch[1].trim();

    const quantity = parseInt(
      amountMatch[1].replace(/,/g, ""),
      10
    );

    let item = amountMatch[2]?.trim() || "Not specified";

    // Clean accidental formatting
    item = item.replace(/\*\*/g, "").trim();

    let price = parseFloat(
      priceMatch[1].replace(/,/g, "")
    );

    const suffix = priceMatch[2]?.toLowerCase();

    if (suffix === "k") price *= 1000;
    if (suffix === "m") price *= 1000000;

    const order = {
      employee:
        message.member?.displayName ||
        message.author.username,

      customer,
      item,
      quantity,
      price,
      messageId: message.id
    };

    console.log("Order detected:", order);

    const response = await fetch(GOOGLE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(order)
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(
        "Google returned an unexpected response:",
        responseText
      );

      await message.react("❌");
      return;
    }

    if (result.success) {
      await message.react("✅");

      console.log("Order successfully logged:", order);
    } else {
      await message.react("❌");

      console.error(
        "Google rejected order:",
        result
      );
    }

  } catch (error) {
    console.error("Order tracking error:", error);

    try {
      await message.react("❌");
    } catch {}
  }
});

client.login(TOKEN);
