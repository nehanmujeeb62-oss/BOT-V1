require("dotenv").config();

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.PREFIX || "!";
const ownerRoleName = process.env.OWNER_ROLE_NAME || "Owner";
const staffRoleName = process.env.STAFF_ROLE_NAME || "Staff";
const paymentInfo = process.env.PAYMENT_INFO || "Open a ticket or message staff for payment details.";
const ticketInfo = process.env.TICKET_INFO || "Open a ticket in the support channel or message a staff member.";
const storeRules = process.env.STORE_RULES || "Be respectful. Do not spam. Follow Discord rules and only buy allowed products.";
const port = process.env.PORT || 3000;

if (!token) {
  console.error("Missing DISCORD_TOKEN. Copy .env.example to .env and add your bot token.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function isStaff(message) {
  if (!message.guild || !message.member) return false;

  const hasAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const hasOwnerRole = message.member.roles.cache.some((role) => role.name === ownerRoleName);
  const hasStaffRole = message.member.roles.cache.some((role) => role.name === staffRoleName);

  return hasAdmin || hasOwnerRole || hasStaffRole;
}

function loadProducts() {
  const productPath = path.join(__dirname, "products.json");
  const raw = fs.readFileSync(productPath, "utf8");
  return JSON.parse(raw);
}

function storeEmbed() {
  const products = loadProducts();

  const embed = new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle("Store Menu")
    .setDescription("Open a ticket or message staff to buy. Make sure every product follows Discord rules and local laws.")
    .setFooter({ text: "Thank you for shopping with us." })
    .setTimestamp();

  for (const product of products) {
    embed.addFields({
      name: product.name,
      value: [
        product.description,
        `Price: ${product.price}`,
        `Duration: ${product.duration}`
      ].join("\n")
    });
  }

  return embed;
}

function storeText() {
  const products = loadProducts();
  const lines = ["Store Menu", ""];

  for (const product of products) {
    lines.push(`${product.name} - ${product.price}`);
    lines.push(`${product.description}`);
    lines.push(`Duration: ${product.duration}`);
    lines.push("");
  }

  lines.push("Open a ticket or message staff to buy.");
  return lines.join("\n");
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle("Bot Commands")
    .addFields(
      { name: `${prefix}help`, value: "Show all commands." },
      { name: `${prefix}store`, value: "Show the store menu." },
      { name: `${prefix}prices`, value: "Show product names and prices." },
      { name: `${prefix}stock`, value: "Show current stock list." },
      { name: `${prefix}buy`, value: "Show how to buy." },
      { name: `${prefix}payment`, value: "Show payment information." },
      { name: `${prefix}rules`, value: "Show store rules." },
      { name: `${prefix}ticket`, value: "Show ticket/support instructions." },
      { name: `${prefix}ping`, value: "Check if the bot is online." },
      { name: `${prefix}say <message>`, value: "Staff only. Make the bot send your message." },
      { name: `${prefix}announce <message>`, value: "Staff only. Send a styled announcement." },
      { name: `${prefix}clear <number>`, value: "Staff only. Delete 1 to 50 recent messages." }
    );
}

function pricesEmbed() {
  const products = loadProducts();
  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle("Price List")
    .setTimestamp();

  for (const product of products) {
    embed.addFields({
      name: product.name,
      value: `Price: ${product.price}\nDuration: ${product.duration}`
    });
  }

  return embed;
}

async function sendEmbedWithFallback(channel, embed, fallbackText) {
  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Could not send embed:", error.message);
    await channel.send(fallbackText);
  }
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`Discord store bot is online as ${client.user?.tag || "starting"}.\n`);
}).listen(port, () => {
  console.log(`Health server running on port ${port}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const [commandName, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = commandName.toLowerCase();

  if (command === "help") {
    await sendEmbedWithFallback(message.channel, helpEmbed(), [
      `${prefix}help - Show commands`,
      `${prefix}store - Show store menu`,
      `${prefix}prices - Show prices`,
      `${prefix}stock - Show stock`,
      `${prefix}buy - How to buy`,
      `${prefix}payment - Payment info`,
      `${prefix}rules - Store rules`,
      `${prefix}ticket - Ticket info`,
      `${prefix}ping - Check bot`,
      `${prefix}say <message> - Staff announcement`,
      `${prefix}announce <message> - Staff embed announcement`,
      `${prefix}clear <number> - Staff clear messages`
    ].join("\n"));
    return;
  }

  if (command === "store") {
    await sendEmbedWithFallback(message.channel, storeEmbed(), storeText());
    return;
  }

  if (command === "prices" || command === "price") {
    await sendEmbedWithFallback(message.channel, pricesEmbed(), storeText());
    return;
  }

  if (command === "stock") {
    const products = loadProducts();
    const stock = products.map((product) => `In stock: ${product.name}`).join("\n");
    await message.channel.send(stock || "No products are listed right now.");
    return;
  }

  if (command === "buy") {
    await message.channel.send(`To buy: ${ticketInfo}`);
    return;
  }

  if (command === "payment" || command === "pay") {
    await message.channel.send(paymentInfo);
    return;
  }

  if (command === "rules") {
    await message.channel.send(storeRules);
    return;
  }

  if (command === "ticket" || command === "support") {
    await message.channel.send(ticketInfo);
    return;
  }

  if (command === "ping") {
    await message.reply("Pong. Bot is online.");
    return;
  }

  if (command === "say") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const text = args.join(" ").trim();
    if (!text) {
      await message.reply(`Use it like this: ${prefix}say Your announcement here`);
      return;
    }

    await message.delete().catch(() => null);
    await message.channel.send(text);
    return;
  }

  if (command === "announce") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const text = args.join(" ").trim();
    if (!text) {
      await message.reply(`Use it like this: ${prefix}announce Your announcement here`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf2c94c)
      .setTitle("Announcement")
      .setDescription(text)
      .setFooter({ text: `Posted by ${message.author.tag}` })
      .setTimestamp();

    await message.delete().catch(() => null);
    await message.channel.send({ embeds: [embed] });
    return;
  }

  if (command === "clear") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const amount = Number.parseInt(args[0], 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
      await message.reply(`Use it like this: ${prefix}clear 10`);
      return;
    }

    await message.channel.bulkDelete(amount + 1, true);
    const reply = await message.channel.send(`Deleted ${amount} messages.`);
    setTimeout(() => reply.delete().catch(() => null), 3000);
  }
});

client.login(token);
