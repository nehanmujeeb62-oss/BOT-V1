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
const ticketInfo = process.env.TICKET_INFO || "Open a ticket in the support channel or message a staff member.";
const storeRules = process.env.STORE_RULES || "Be respectful. Do not spam. Follow Discord rules and only buy allowed products.";
const ticketCategoryName = process.env.TICKET_CATEGORY_NAME || "Tickets";
const storeHours = process.env.STORE_HOURS || "Staff reply when available.";
const contactInfo = process.env.CONTACT_INFO || "Open a ticket or message a staff member.";
const faqInfo = process.env.FAQ_INFO || "Use !store to view products, !order to start buying, and !ticketpanel to open support.";
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
      { name: `${prefix}order <item>`, value: "Start an order for an item." },
      { name: `${prefix}buy`, value: "Show how to buy." },
      { name: `${prefix}faq`, value: "Show store FAQ." },
      { name: `${prefix}hours`, value: "Show store hours." },
      { name: `${prefix}contact`, value: "Show contact/support info." },
      { name: `${prefix}review <message>`, value: "Post a customer review." },
      { name: `${prefix}rules`, value: "Show store rules." },
      { name: `${prefix}ticket`, value: "Show ticket/support instructions." },
      { name: `${prefix}ticketpanel`, value: "Staff only. Send a ticket button panel." },
      { name: `${prefix}ping`, value: "Check if the bot is online." },
      { name: `${prefix}uptime`, value: "Show bot uptime." },
      { name: `${prefix}botinfo`, value: "Show bot information." },
      { name: `${prefix}serverinfo`, value: "Show server information." },
      { name: `${prefix}userinfo [@user]`, value: "Show user information." },
      { name: `${prefix}avatar [@user]`, value: "Show user avatar." },
      { name: `${prefix}say <message>`, value: "Staff only. Make the bot send your message." },
      { name: `${prefix}announce <message>`, value: "Staff only. Send a styled announcement." },
      { name: `${prefix}dm @user <message>`, value: "Staff only. DM a customer." },
      { name: `${prefix}restock <message>`, value: "Staff only. Post a restock notice." },
      { name: `${prefix}soldout <message>`, value: "Staff only. Post a sold-out notice." },
      { name: `${prefix}clear <number>`, value: "Staff only. Delete 1 to 50 recent messages." },
      { name: `${prefix}slowmode <seconds>`, value: "Staff only. Set channel slowmode." },
      { name: `${prefix}lock`, value: "Staff only. Lock the current channel." },
      { name: `${prefix}unlock`, value: "Staff only. Unlock the current channel." },
      { name: `${prefix}close`, value: "Close the current ticket channel." },
      { name: `${prefix}rename <name>`, value: "Staff only. Rename the current ticket." },
      { name: `${prefix}add @user`, value: "Staff only. Add a user to the current ticket." },
      { name: `${prefix}remove @user`, value: "Staff only. Remove a user from the current ticket." },
      { name: `${prefix}kick @user [reason]`, value: "Staff only. Kick a user." },
      { name: `${prefix}ban @user [reason]`, value: "Staff only. Ban a user." },
      { name: `${prefix}timeout @user <minutes> [reason]`, value: "Staff only. Timeout a user." }
    );
}

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Open a Ticket")
    .setDescription(ticketInfo)
    .addFields(
      { name: "Buying", value: "Click the button below and tell staff what you want to buy." },
      { name: "Support", value: "Use a ticket for order help, questions, or payment support." }
    )
    .setFooter({ text: "Staff will reply as soon as possible." });
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
      `${prefix}order <item> - Start order`,
      `${prefix}buy - How to buy`,
      `${prefix}faq - Store FAQ`,
      `${prefix}hours - Store hours`,
      `${prefix}contact - Contact info`,
      `${prefix}review <message> - Post review`,
      `${prefix}rules - Store rules`,
      `${prefix}ticket - Ticket info`,
      `${prefix}ticketpanel - Staff ticket button panel`,
      `${prefix}ping - Check bot`,
      `${prefix}uptime - Bot uptime`,
      `${prefix}botinfo - Bot info`,
      `${prefix}serverinfo - Server info`,
      `${prefix}userinfo [@user] - User info`,
      `${prefix}avatar [@user] - Avatar`,
      `${prefix}say <message> - Staff announcement`,
      `${prefix}announce <message> - Staff embed announcement`,
      `${prefix}dm @user <message> - Staff DM`,
      `${prefix}restock <message> - Staff restock notice`,
      `${prefix}soldout <message> - Staff sold-out notice`,
      `${prefix}clear <number> - Staff clear messages`,
      `${prefix}slowmode <seconds> - Staff slowmode`,
      `${prefix}lock - Staff lock channel`,
      `${prefix}unlock - Staff unlock channel`,
      `${prefix}close - Close ticket`,
      `${prefix}rename <name> - Staff rename ticket`,
      `${prefix}add @user - Staff add user to ticket`,
      `${prefix}remove @user - Staff remove user from ticket`,
      `${prefix}kick @user [reason] - Staff kick`,
      `${prefix}ban @user [reason] - Staff ban`,
      `${prefix}timeout @user <minutes> [reason] - Staff timeout`
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

  if (command === "order") {
    const item = args.join(" ").trim();
    await message.channel.send(item ? `Order request for "${item}": ${ticketInfo}` : `Use it like this: ${prefix}order Product Name`);
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
      await message.reply(`Use it like this: ${prefix}review Great service`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle("Customer Review")
      .setDescription(text)
      .setFooter({ text: `Review by ${message.author.tag}` })
      .setTimestamp();
    await sendEmbedWithFallback(message.channel, embed, `Review by ${message.author.tag}: ${text}`);
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
    await message.reply("Pong. Bot is online.");
    return;
  }

  if (command === "uptime") {
    await message.reply(`Bot uptime: ${formatUptime(client.uptime || 0)}`);
    return;
  }

  if (command === "botinfo") {
    const embed = new EmbedBuilder()
      .setColor(0x2f80ed)
      .setTitle("Bot Info")
      .addFields(
        { name: "Bot", value: client.user.tag, inline: true },
        { name: "Prefix", value: prefix, inline: true },
        { name: "Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "Uptime", value: formatUptime(client.uptime || 0), inline: true }
      )
      .setTimestamp();
    await sendEmbedWithFallback(message.channel, embed, `Bot: ${client.user.tag}\nPrefix: ${prefix}`);
    return;
  }

  if (command === "serverinfo") {
    const embed = new EmbedBuilder()
      .setColor(0x2f80ed)
      .setTitle("Server Info")
      .addFields(
        { name: "Server", value: message.guild.name, inline: true },
        { name: "Members", value: String(message.guild.memberCount), inline: true },
        { name: "Channels", value: String(message.guild.channels.cache.size), inline: true },
        { name: "Created", value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:D>`, inline: true }
      );
    await sendEmbedWithFallback(message.channel, embed, `Server: ${message.guild.name}\nMembers: ${message.guild.memberCount}`);
    return;
  }

  if (command === "userinfo") {
    const member = message.mentions.members.first() || message.member;
    const embed = new EmbedBuilder()
      .setColor(0x2f80ed)
      .setTitle("User Info")
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "User", value: member.user.tag, inline: true },
        { name: "ID", value: member.id, inline: true },
        { name: "Joined", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Unknown", inline: true },
        { name: "Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
      );
    await sendEmbedWithFallback(message.channel, embed, `User: ${member.user.tag}\nID: ${member.id}`);
    return;
  }

  if (command === "avatar") {
    const user = message.mentions.users.first() || message.author;
    await message.channel.send(user.displayAvatarURL({ size: 1024 }));
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

  if (command === "dm") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const user = message.mentions.users.first();
    const text = args.slice(1).join(" ").trim();
    if (!user || !text) {
      await message.reply(`Use it like this: ${prefix}dm @user Your message`);
      return;
    }

    await user.send(text);
    await message.reply(`DM sent to ${user.tag}.`);
    return;
  }

  if (command === "restock" || command === "soldout") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const text = args.join(" ").trim();
    if (!text) {
      await message.reply(`Use it like this: ${prefix}${command} Product name`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(command === "restock" ? 0x27ae60 : 0xeb5757)
      .setTitle(command === "restock" ? "Restock Notice" : "Sold Out Notice")
      .setDescription(text)
      .setTimestamp();
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
    return;
  }

  if (command === "slowmode") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const seconds = Number.parseInt(args[0], 10);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
      await message.reply(`Use it like this: ${prefix}slowmode 5`);
      return;
    }

    await message.channel.setRateLimitPerUser(seconds);
    await message.reply(`Slowmode set to ${seconds} seconds.`);
    return;
  }

  if (command === "lock" || command === "unlock") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const allowSend = command === "unlock";
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: allowSend
    });
    await message.reply(allowSend ? "Channel unlocked." : "Channel locked.");
    return;
  }

  if (command === "close") {
    if (!message.channel.name.startsWith("ticket-") && !isStaff(message)) {
      await message.reply("Only ticket channels or staff can use this command.");
      return;
    }

    await message.reply("Closing ticket in 3 seconds.");
    setTimeout(() => message.channel.delete().catch(() => null), 3000);
    return;
  }

  if (command === "rename") {
    if (!isStaff(message)) {
      await message.reply("Only staff can use this command.");
      return;
    }

    const name = args.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
    if (!name) {
      await message.reply(`Use it like this: ${prefix}rename order-123`);
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
      await message.reply(`Use it like this: ${prefix}${command} @user`);
      return;
    }

    await message.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: command === "add",
      SendMessages: command === "add",
      ReadMessageHistory: command === "add"
    });
    await message.reply(command === "add" ? `${member} added to this channel.` : `${member} removed from this channel.`);
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
      await message.reply(`Use it like this: ${prefix}${command} @user reason`);
      return;
    }

    if (command === "kick") {
      await member.kick(reason);
      await message.reply(`${member.user.tag} was kicked. Reason: ${reason}`);
      return;
    }

    await member.ban({ reason });
    await message.reply(`${member.user.tag} was banned. Reason: ${reason}`);
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
    if (!member || !Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
      await message.reply(`Use it like this: ${prefix}timeout @user 10 reason`);
      return;
    }

    await member.timeout(minutes * 60 * 1000, reason);
    await message.reply(`${member.user.tag} timed out for ${minutes} minutes. Reason: ${reason}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== "open_ticket") return;

  const guild = interaction.guild;
  const member = interaction.member;
  if (!guild || !member) {
    await interaction.reply({ content: "Tickets only work inside a server.", ephemeral: true });
    return;
  }

  const existing = guild.channels.cache.find((channel) => {
    return channel.name === `ticket-${interaction.user.id}` && channel.type === ChannelType.GuildText;
  });

  if (existing) {
    await interaction.reply({ content: `You already have a ticket: ${existing}`, ephemeral: true });
    return;
  }

  let category = guild.channels.cache.find((channel) => {
    return channel.name === ticketCategoryName && channel.type === ChannelType.GuildCategory;
  });

  if (!category) {
    category = await guild.channels.create({
      name: ticketCategoryName,
      type: ChannelType.GuildCategory
    });
  }

  const staffRole = guild.roles.cache.find((role) => role.name === staffRoleName);
  const ownerRole = guild.roles.cache.find((role) => role.name === ownerRoleName);
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
        .setDescription("Please write what you want to buy or what help you need.")
        .setTimestamp()
    ],
    components: [closeTicketButtonRow()]
  });

  await interaction.reply({ content: `Ticket opened: ${channel}`, ephemeral: true });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== "close_ticket") return;

  const staff = isStaff({ guild: interaction.guild, member: interaction.member });
  if (!interaction.channel?.name?.startsWith("ticket-") && !staff) {
    await interaction.reply({ content: "Only ticket channels or staff can use this button.", ephemeral: true });
    return;
  }

  await interaction.reply("Closing ticket in 3 seconds.");
  setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
});

client.login(token);
