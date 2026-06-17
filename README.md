# Discord Store Bot

Commands:

- `!say your text` makes the bot repeat your message.
- `!announce your text` sends a styled announcement.
- `!store` shows products from `products.json`.
- `!prices` shows prices.
- `!stock` shows stock.
- `!buy` shows how to buy.
- `!payment` shows payment info.
- `!rules` shows store rules.
- `!ticket` shows ticket instructions.
- `!ping` checks if the bot is online.
- `!clear 10` deletes recent messages. Staff only.
- `!help` shows commands.

Important: selling Discord accounts, Nitro, or server boosts can violate Discord rules. Use this bot for legitimate products and services you are allowed to sell.

## Start on Windows CMD

Open CMD and run:

```cmd
cd /d C:\Users\tommy\Documents\Codex\2026-06-17\i-want-a-discord-bot-for\outputs\discord-store-bot
copy .env.example .env
notepad .env
npm install
npm start
```

Or double-click `start-bot.cmd`.

In `.env`, replace `put_your_bot_token_here` with your real bot token.

In the Discord Developer Portal, turn on **Message Content Intent** for the bot.

The bot also needs these server permissions:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages
