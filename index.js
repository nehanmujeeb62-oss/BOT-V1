require("dotenv").config();

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionsBitField,
  PermissionFlagsBits
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.PREFIX || "!";
const ownerRoleName = process.env.OWNER_ROLE_NAME || "Owner";
const staffRoleName = process.env.STAFF_ROLE_NAME || "Staff";
const ticketInfo =
  process.env.TICKET_INFO ||
  "Open a ticket in the support channel or message a staff member.";
const storeRules =
  process.env.STORE_RULES ||
  "Be respectful. Do not spam. Follow Discord rules and only buy allowed products.";
const ticketCategoryName = process.env.TICKET_CATEGORY_NAME || "Tickets";
const storeHours = process.env.STORE_HOURS || "Staff reply when available.";
const contactInfo =
  process.env.CONTACT_INFO ||
  "Open a ticket or message a staff member.";
const faqInfo =
  process.env.FAQ_INFO ||
  "Use !store to view products, !order to start buying, and !ticketpanel to open support.";
const port = process.env.PORT || 3000;

const databasePath = path.join(__dirname, "database.json");
const productsPath = path.join(__dirname, "products.json");

if (!token || token === "put_your_bot_token_here") {
  console.error("ERROR: Set your real DISCORD_TOKEN in the hosting variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// -------------------- STAFF CHECK --------------------

function isStaff(message) {
  if (!message.guild || !message.member) return false;

  const hasAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  const hasOwnerRole = message.member.roles.cache.some(
    role => role.name === ownerRoleName
  );

  const hasStaffRole = message.member.roles.cache.some(
    role => role.name === staffRoleName
  );

  return hasAdmin || hasOwnerRole || hasStaffRole;
}

// -------------------- DATABASE --------------------

function ensureDatabase() {
  if (fs.existsSync(databasePath)) return;

  let products = [];

  if (fs.existsSync(productsPath)) {
    try {
      products = JSON.parse(
        fs.readFileSync(productsPath, "utf8")
      );

      if (!Array.isArray(products)) products = [];
    } catch (error) {
      console.error("Could not read products.json:", error.message);
      products = [];
    }
  }

  const database = {
    products: products.map(product => ({
      ...product,
      stock: product.stock ?? "In stock"
    })),
    orders: [],
    reviews: []
  };

  fs.writeFileSync(
    databasePath,
    JSON.stringify(database, null, 2)
  );
}

function readDatabase() {
  ensureDatabase();

  return JSON.parse(
    fs.readFileSync(databasePath, "utf8")
  );
}

function writeDatabase(database) {
  fs.writeFileSync(
    databasePath,
    JSON.stringify(database, null, 2)
  );
}

function loadProducts() {
  return readDatabase().products;
}

function findProduct(database, productName) {
  return database.products.find(product =>
    product.name.toLowerCase() === productName.toLowerCase()
  );
}

// -------------------- STORE EMBEDS --------------------

function storeEmbed() {
  const products = loadProducts();

  const embed = new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle("Store Menu")
    .setDescription(
      "Open a ticket or message staff to buy. Make sure every product follows Discord rules and local laws."
    )
    .setFooter({
      text: "Thank you for shopping with us."
    })
    .setTimestamp();

  if (products.length === 0) {
    embed.addFields({
      name: "No Products",
      value: "No products are listed right now."
    });

    return embed;
  }

  for (const product of products.slice(0, 25)) {
    embed.addFields({
      name: String(product.name).slice(0, 256),
      value: [
        product.description || "No description",
        `Price: ${product.price || "Contact staff"}`,
        `Duration: ${product.duration || "Not specified"}`,
        `Stock: ${product.stock ?? "In stock"}`
      ].join("\n").slice(0, 1024)
    });
  }

  return embed;
}

function storeText() {
  const products = loadProducts();
  const lines = ["Store Menu", ""];

  for (const product of products) {
    lines.push(`${product.name} - ${product.price}`);
    lines.push(product.description || "No description");
    lines.push(`Duration: ${product.duration || "Not specified"}`);
    lines.push(`Stock: ${product.stock ?? "In stock"}`);
    lines.push("");
  }

  lines.push("Open a ticket or message staff to buy.");

  return lines.join("\n").slice(0, 1900);
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle("Bot Commands")
    .setDescription([
      `**${prefix}help** — Show all commands`,
      `**${prefix}store** — Show store menu`,
      `**${prefix}prices** — Show product prices`,
      `**${prefix}stock** — Show stock`,
      `**${prefix}order <item>** — Start an order`,
      `**${prefix}orders** — Staff: show recent orders`,
      `**${prefix}reviews** — Show reviews`,
      `**${prefix}buy** — How to buy`,
      `**${prefix}faq** — Store FAQ`,
      `**${prefix}hours** — Store hours`,
      `**${prefix}contact** — Contact information`,
      `**${prefix}review <message>** — Post a review`,
      `**${prefix}rules** — Store rules`,
      `**${prefix}ticket** — Ticket information`,
      `**${prefix}ticketpanel** — Staff: post ticket panel`,
      `**${prefix}ping** — Check bot response`,
      `**${prefix}uptime** — Show uptime`,
      `**${prefix}botinfo** — Bot information`,
      `**${prefix}serverinfo** — Server information`,
      `**${prefix}userinfo [@user]** — User information`,
      `**${prefix}avatar [@user]** — Show avatar`,
      `**${prefix}say <message>** — Staff: send a message`,
      `**${prefix}announce <message>** — Staff announcement`,
      `**${prefix}dm @user <message>** — Staff: send a DM`,
      `**${prefix}addproduct name | price | duration | description**`,
      `**${prefix}editproduct name | price | duration | description**`,
      `**${prefix}removeproduct name**`,
      `**${prefix}setstock name | stock**`,
      `**${prefix}restock <message>**`,
      `**${prefix}soldout <message>**`,
      `**${prefix}clear <number>**`,
      `**${prefix}slowmode <seconds>**`,
      `**${prefix}lock** / **${prefix}unlock**`,
      `**${prefix}close**`,
      `**${prefix}rename <name>**`,
      `**${prefix}add @user** / **${prefix}remove @user**`,
      `**${prefix}kick @user [reason]**`,
      `**${prefix}ban @user [reason]**`,
      `**${prefix}timeout @user <minutes> [reason]**`
    ].join("\n"))
    .setFooter({
      text: "Staff commands require the appropriate role or administrator permission."
    });
}

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Open a Ticket")
    .setDescription(ticketInfo)
    .addFields(
      {
        name: "Buying",
        value: "Click the button below and tell staff what you want to buy."
      },
      {
        name: "Support",
        value: "Use a ticket for order help, questions, or payment support."
      }
    )
    .setFooter({
      text: "Staff will reply as soon as possible."
    });
}

function ticketButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Primary)
  );
}

function closeTicketButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function pricesEmbed() {
  const products = loadProducts();

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle("Price List")
    .setTimestamp();

  if (products.length === 0) {
    embed.setDescription("No products are listed right now.");
    return embed;
  }

  for (const product of products.slice(0, 25)) {
    embed.addFields({
      name: String(product.name).slice(0, 256),
      value: `Price: ${product.price || "Contact staff"}\nDuration: ${product.duration || "Not specified"}`.slice(0, 1024)
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

// -------------------- READY --------------------

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} server(s).`);
  console.log(`Prefix: ${prefix}`);
});

// -------------------- HOST HEALTH SERVER --------------------

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end(
    `Discord store bot is ${client.isReady() ? "online" : "starting"}.\n`
  );
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Health server running on port ${port}`);
});

// -------------------- COMMANDS --------------------

client.on("messageCreate", async message => {
  try {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const input = message.content.slice(prefix.length).trim();
    if (!input) return;

    const [commandName, ...args] = input.split(/\s+/);
    const command = commandName.toLowerCase();

    if (command === "help") {
      await sendEmbedWithFallback(
        message.channel,
        helpEmbed(),
        "Use !store, !prices, !stock, !order, !ticket, !ping and !help."
      );
      return;
    }

    if (command === "store") {
      await sendEmbedWithFallback(
        message.channel,
        storeEmbed(),
        storeText()
      );
      return;
    }

    if (command === "prices" || command === "price") {
      await sendEmbedWithFallback(
        message.channel,
        pricesEmbed(),
        storeText()
      );
      return;
    }

    if (command === "stock") {
      const products = loadProducts();

      const stock = products
        .map(product => `${product.name}: ${product.stock ?? "In stock"}`)
        .join("\n");

      await message.channel.send(
        stock || "No products are listed right now."
      );
      return;
    }

    if (command === "buy") {
      await message.channel.send(`To buy: ${ticketInfo}`);
      return;
    }

    if (command === "order") {
      const item = args.join(" ").trim();

      if (!item) {
        await message.reply(`Use: ${prefix}order Product Name`);
        return;
      }

      const database = readDatabase();

      const order = {
        id: database.orders.length + 1,
        item,
        userId: message.author.id,
        userTag: message.author.tag,
        status: "open",
        createdAt: new Date().toISOString()
      };

      database.orders.push(order);
      writeDatabase(database);

      await message.channel.send(
        `Order #${order.id} saved for "${item}". ${ticketInfo}`
      );
      return;
    }

    if (command === "orders") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const database = readDatabase();

      const orders = database.orders.slice(-10).map(order =>
        `#${order.id} ${order.item} - ${order.userTag} - ${order.status}`
      );

      await message.channel.send(
        orders.length ? orders.join("\n") : "No orders saved yet."
      );
      return;
    }

    if (command === "reviews") {
      const database = readDatabase();

      const reviews = database.reviews.slice(-5).map(review =>
        `${review.userTag}: ${review.message}`
      );

      await message.channel.send(
        reviews.length ? reviews.join("\n").slice(0, 1900) : "No reviews saved yet."
      );
      return;
    }

    if (command === "faq") {
      await message.channel.send(faqInfo);
      return;
    }

    if (command === "hours") {
      await message.channel.send(storeHours);
      return;
    }

    if (command === "contact") {
      await message.channel.send(contactInfo);
      return;
    }

    if (command === "review") {
      const text = args.join(" ").trim();

      if (!text) {
        await message.reply(`Use: ${prefix}review Great service`);
        return;
      }

      const database = readDatabase();

      database.reviews.push({
        userId: message.author.id,
        userTag: message.author.tag,
        message: text,
        createdAt: new Date().toISOString()
      });

      writeDatabase(database);

      const embed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle("Customer Review")
        .setDescription(text.slice(0, 4000))
        .setFooter({
          text: `Review by ${message.author.tag}`
        })
        .setTimestamp();

      await sendEmbedWithFallback(
        message.channel,
        embed,
        `Review by ${message.author.tag}: ${text}`
      );
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

    if (command === "ticketpanel") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      await message.channel.send({
        embeds: [ticketPanelEmbed()],
        components: [ticketButtonRow()]
      });
      return;
    }

    if (command === "ping") {
      await message.reply(
        `Pong! WebSocket ping: ${client.ws.ping}ms`
      );
      return;
    }

    if (command === "uptime") {
      await message.reply(
        `Bot uptime: ${formatUptime(client.uptime || 0)}`
      );
      return;
    }

    if (command === "botinfo") {
      const embed = new EmbedBuilder()
        .setColor(0x2f80ed)
        .setTitle("Bot Info")
        .addFields(
          {
            name: "Bot",
            value: client.user.tag,
            inline: true
          },
          {
            name: "Prefix",
            value: prefix,
            inline: true
          },
          {
            name: "Servers",
            value: String(client.guilds.cache.size),
            inline: true
          },
          {
            name: "Uptime",
            value: formatUptime(client.uptime || 0),
            inline: true
          }
        )
        .setTimestamp();

      await sendEmbedWithFallback(
        message.channel,
        embed,
        `Bot: ${client.user.tag}\nPrefix: ${prefix}`
      );
      return;
    }

    if (command === "serverinfo") {
      if (!message.guild) {
        await message.reply("Use this command inside a server.");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x2f80ed)
        .setTitle("Server Info")
        .addFields(
          {
            name: "Server",
            value: message.guild.name,
            inline: true
          },
          {
            name: "Members",
            value: String(message.guild.memberCount),
            inline: true
          },
          {
            name: "Channels",
            value: String(message.guild.channels.cache.size),
            inline: true
          },
          {
            name: "Created",
            value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:D>`,
            inline: true
          }
        );

      await sendEmbedWithFallback(
        message.channel,
        embed,
        `Server: ${message.guild.name}\nMembers: ${message.guild.memberCount}`
      );
      return;
    }

    if (command === "userinfo") {
      if (!message.guild) {
        await message.reply("Use this command inside a server.");
        return;
      }

      const member =
        message.mentions.members.first() || message.member;

      const embed = new EmbedBuilder()
        .setColor(0x2f80ed)
        .setTitle("User Info")
        .setThumbnail(
          member.user.displayAvatarURL({ size: 256 })
        )
        .addFields(
          {
            name: "User",
            value: member.user.tag,
            inline: true
          },
          {
            name: "ID",
            value: member.id,
            inline: true
          },
          {
            name: "Joined",
            value: member.joinedTimestamp
              ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
              : "Unknown",
            inline: true
          },
          {
            name: "Created",
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`,
            inline: true
          }
        );

      await sendEmbedWithFallback(
        message.channel,
        embed,
        `User: ${member.user.tag}\nID: ${member.id}`
      );
      return;
    }

    if (command === "avatar") {
      const user =
        message.mentions.users.first() || message.author;

      await message.channel.send(
        user.displayAvatarURL({ size: 1024 })
      );
      return;
    }

    if (command === "say") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const text = args.join(" ").trim();

      if (!text) {
        await message.reply(`Use: ${prefix}say Your announcement here`);
        return;
      }

      await message.delete().catch(() => null);
      await message.channel.send({
        content: text,
        allowedMentions: { parse: [] }
      });
      return;
    }

    if (command === "announce") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const text = args.join(" ").trim();

      if (!text) {
        await message.reply(`Use: ${prefix}announce Your announcement here`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xf2c94c)
        .setTitle("Announcement")
        .setDescription(text.slice(0, 4000))
        .setFooter({
          text: `Posted by ${message.author.tag}`
        })
        .setTimestamp();

      await message.delete().catch(() => null);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (command === "dm") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const user = message.mentions.users.first();
      const text = args.slice(1).join(" ").trim();

      if (!user || !text) {
        await message.reply(`Use: ${prefix}dm @user Your message`);
        return;
      }

      try {
        await user.send(text);
        await message.reply(`DM sent to ${user.tag}.`);
      } catch {
        await message.reply("Could not send the DM. The user may have DMs disabled.");
      }

      return;
    }

    // -------------------- PRODUCT MANAGEMENT --------------------

    if (command === "addproduct") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const parts = args.join(" ").split("|").map(part => part.trim());
      const [name, price, duration, description] = parts;

      if (!name || !price || !duration || !description) {
        await message.reply(
          `Use: ${prefix}addproduct Name | ₹100 | 1 month | Product description`
        );
        return;
      }

      const database = readDatabase();

      if (findProduct(database, name)) {
        await message.reply("That product already exists.");
        return;
      }

      database.products.push({
        name,
        price,
        duration,
        description,
        stock: "In stock"
      });

      writeDatabase(database);

      await message.reply(`Product added: ${name}`);
      return;
    }

    if (command === "editproduct") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const parts = args.join(" ").split("|").map(part => part.trim());
      const [name, price, duration, description] = parts;

      if (!name || !price || !duration || !description) {
        await message.reply(
          `Use: ${prefix}editproduct Name | ₹100 | 1 month | New description`
        );
        return;
      }

      const database = readDatabase();
      const product = findProduct(database, name);

      if (!product) {
        await message.reply("Product not found.");
        return;
      }

      product.price = price;
      product.duration = duration;
      product.description = description;

      writeDatabase(database);

      await message.reply(`Product updated: ${product.name}`);
      return;
    }

    if (command === "removeproduct") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const name = args.join(" ").trim();

      if (!name) {
        await message.reply(`Use: ${prefix}removeproduct Product Name`);
        return;
      }

      const database = readDatabase();
      const before = database.products.length;

      database.products = database.products.filter(
        product => product.name.toLowerCase() !== name.toLowerCase()
      );

      if (database.products.length === before) {
        await message.reply("Product not found.");
        return;
      }

      writeDatabase(database);

      await message.reply(`Product removed: ${name}`);
      return;
    }

    if (command === "setstock") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const parts = args.join(" ").split("|").map(part => part.trim());
      const [name, stock] = parts;

      if (!name || !stock) {
        await message.reply(
          `Use: ${prefix}setstock Product Name | 5 available`
        );
        return;
      }

      const database = readDatabase();
      const product = findProduct(database, name);

      if (!product) {
        await message.reply("Product not found.");
        return;
      }

      product.stock = stock;
      writeDatabase(database);

      await message.reply(
        `Stock updated for ${product.name}: ${stock}`
      );
      return;
    }

    if (command === "restock" || command === "soldout") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const text = args.join(" ").trim();

      if (!text) {
        await message.reply(
          `Use: ${prefix}${command} Product name`
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(command === "restock" ? 0x27ae60 : 0xeb5757)
        .setTitle(
          command === "restock" ? "Restock Notice" : "Sold Out Notice"
        )
        .setDescription(text.slice(0, 4000))
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      return;
    }

    // -------------------- MODERATION --------------------

    if (command === "clear") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const amount = Number.parseInt(args[0], 10);

      if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
        await message.reply(`Use: ${prefix}clear 10`);
        return;
      }

      if (!message.channel.bulkDelete) {
        await message.reply("This command is not supported in this channel.");
        return;
      }

      await message.channel.bulkDelete(amount + 1, true);

      const reply = await message.channel.send(
        `Deleted up to ${amount} messages.`
      );

      setTimeout(() => {
        reply.delete().catch(() => null);
      }, 3000);

      return;
    }

    if (command === "slowmode") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const seconds = Number.parseInt(args[0], 10);

      if (
        !Number.isInteger(seconds) ||
        seconds < 0 ||
        seconds > 21600
      ) {
        await message.reply(`Use: ${prefix}slowmode 5`);
        return;
      }

      await message.channel.setRateLimitPerUser(seconds);

      await message.reply(
        `Slowmode set to ${seconds} seconds.`
      );
      return;
    }

    if (command === "lock" || command === "unlock") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const allowSend = command === "unlock";

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: allowSend }
      );

      await message.reply(
        allowSend ? "Channel unlocked." : "Channel locked."
      );
      return;
    }

    if (command === "close") {
      if (
        !message.channel.name.startsWith("ticket-") &&
        !isStaff(message)
      ) {
        await message.reply(
          "Only ticket channels or staff can use this command."
        );
        return;
      }

      await message.reply("Closing ticket in 3 seconds.");

      setTimeout(() => {
        message.channel.delete().catch(() => null);
      }, 3000);

      return;
    }

    if (command === "rename") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const name = args
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 80);

      if (!name) {
        await message.reply(`Use: ${prefix}rename order-123`);
        return;
      }

      await message.channel.setName(name);

      await message.reply(`Channel renamed to ${name}.`);
      return;
    }

    if (command === "add" || command === "remove") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const member = message.mentions.members.first();

      if (!member) {
        await message.reply(`Use: ${prefix}${command} @user`);
        return;
      }

      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: command === "add",
        SendMessages: command === "add",
        ReadMessageHistory: command === "add"
      });

      await message.reply(
        command === "add"
          ? `${member} added to this channel.`
          : `${member} removed from this channel.`
      );

      return;
    }

    if (command === "kick" || command === "ban") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const member = message.mentions.members.first();
      const reason = args.slice(1).join(" ").trim() || "No reason provided";

      if (!member) {
        await message.reply(
          `Use: ${prefix}${command} @user reason`
        );
        return;
      }

      if (command === "kick") {
        await member.kick(reason);

        await message.reply(
          `${member.user.tag} was kicked. Reason: ${reason}`
        );

        return;
      }

      await member.ban({ reason });

      await message.reply(
        `${member.user.tag} was banned. Reason: ${reason}`
      );

      return;
    }

    if (command === "timeout") {
      if (!isStaff(message)) {
        await message.reply("Only staff can use this command.");
        return;
      }

      const member = message.mentions.members.first();
      const minutes = Number.parseInt(args[1], 10);
      const reason = args.slice(2).join(" ").trim() || "No reason provided";

      if (
        !member ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 10080
      ) {
        await message.reply(
          `Use: ${prefix}timeout @user 10 reason`
        );
        return;
      }

      await member.timeout(minutes * 60 * 1000, reason);

      await message.reply(
        `${member.user.tag} timed out for ${minutes} minutes. Reason: ${reason}`
      );

      return;
    }
  } catch (error) {
    console.error("Command error:", error);

    if (message.channel && message.channel.send) {
      await message.channel
        .send("An error occurred while running that command. Check the hosting console.")
        .catch(() => null);
    }
  }
});

// -------------------- OPEN TICKET BUTTON --------------------

client.on("interactionCreate", async interaction => {
  if (
    !interaction.isButton() ||
    interaction.customId !== "open_ticket"
  ) {
    return;
  }

  try {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "Tickets only work inside a server.",
        ephemeral: true
      });
      return;
    }

    const existing = guild.channels.cache.find(channel =>
      channel.name === `ticket-${interaction.user.id}` &&
      channel.type === ChannelType.GuildText
    );

    if (existing) {
      await interaction.reply({
        content: `You already have a ticket: ${existing}`,
        ephemeral: true
      });
      return;
    }

    let category = guild.channels.cache.find(channel =>
      channel.name === ticketCategoryName &&
      channel.type === ChannelType.GuildCategory
    );

    if (!category) {
      category = await guild.channels.create({
        name: ticketCategoryName,
        type: ChannelType.GuildCategory
      });
    }

    const staffRole = guild.roles.cache.find(
      role => role.name === staffRoleName
    );

    const ownerRole = guild.roles.cache.find(
      role => role.name === ownerRoleName
    );

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    for (const role of [staffRole, ownerRole].filter(Boolean)) {
      permissionOverwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites
    });

    await channel.send({
      content: `${interaction.user} welcome. Staff will help you here.`,
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("New Ticket")
          .setDescription(
            "Please write what you want to buy or what help you need."
          )
          .setTimestamp()
      ],
      components: [closeTicketButtonRow()]
    });

    await interaction.reply({
      content: `Ticket opened: ${channel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error("Open ticket error:", error);

    const reply = {
      content: "Could not open the ticket. Check bot permissions and the hosting console.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => null);
    } else {
      await interaction.reply(reply).catch(() => null);
    }
  }
});

// -------------------- CLOSE TICKET BUTTON --------------------

client.on("interactionCreate", async interaction => {
  if (
    !interaction.isButton() ||
    interaction.customId !== "close_ticket"
  ) {
    return;
  }

  try {
    const isTicket = interaction.channel?.name?.startsWith("ticket-");
    const staff = isStaff({
      guild: interaction.guild,
      member: interaction.member
    });

    if (!isTicket && !staff) {
      await interaction.reply({
        content: "Only ticket channels or staff can use this button.",
        ephemeral: true
      });
      return;
    }

    if (isTicket && !staff) {
      const channelOwnerId = interaction.channel.name.slice("ticket-".length);

      if (channelOwnerId !== interaction.user.id) {
        await interaction.reply({
          content: "Only the ticket owner or staff can close this ticket.",
          ephemeral: true
        });
        return;
      }
    }

    await interaction.reply("Closing ticket in 3 seconds.");

    setTimeout(() => {
      interaction.channel.delete().catch(() => null);
    }, 3000);
  } catch (error) {
    console.error("Close ticket error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Could not close the ticket. Check bot permissions.",
        ephemeral: true
      }).catch(() => null);
    }
  }
});

// -------------------- LOGIN AND ERROR HANDLING --------------------

client.on("error", error => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("Unhandled promise rejection:", error);
});

client.login(token).catch(error => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
