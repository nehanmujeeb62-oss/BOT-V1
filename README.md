# Discord Store Bot

Commands:

- `!say your text` makes the bot repeat your message.
- `!announce your text` sends a styled announcement.
- `!store` shows products from `products.json`.
- `!prices` shows prices.
- `!stock` shows stock.
- `!order product name` starts an order.
- `!orders` shows recent orders. Staff only.
- `!buy` shows how to buy.
- `!faq` shows store FAQ.
- `!hours` shows store hours.
- `!contact` shows contact info.
- `!review message` posts a customer review.
- `!reviews` shows recent reviews.
- `!rules` shows store rules.
- `!ticket` shows ticket instructions.
- `!ticketpanel` sends a ticket button panel. Staff only.
- `!ping` checks if the bot is online.
- `!uptime` shows bot uptime.
- `!botinfo` shows bot info.
- `!serverinfo` shows server info.
- `!userinfo @user` shows user info.
- `!avatar @user` shows avatar.
- `!dm @user message` sends a DM. Staff only.
- `!addproduct Name | $5 | 1 month | Description` adds a product. Staff only.
- `!editproduct Name | $5 | 1 month | New description` edits a product. Staff only.
- `!removeproduct Name` removes a product. Staff only.
- `!setstock Name | 5 available` updates stock. Staff only.
- `!restock message` posts a restock notice. Staff only.
- `!soldout message` posts a sold-out notice. Staff only.
- `!clear 10` deletes recent messages. Staff only.
- `!slowmode 5` sets channel slowmode. Staff only.
- `!lock` locks the channel. Staff only.
- `!unlock` unlocks the channel. Staff only.
- `!close` closes a ticket.
- `!rename order-name` renames a ticket. Staff only.
- `!add @user` adds a user to a ticket. Staff only.
- `!remove @user` removes a user from a ticket. Staff only.
- `!kick @user reason` kicks a user. Staff only.
- `!ban @user reason` bans a user. Staff only.
- `!timeout @user 10 reason` times out a user. Staff only.
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

## Database

The bot uses `database.json` to save products, orders, reviews, and stock.

Upload this file to GitHub with `index.js`:

```text
database.json
```

On Render free hosting, file changes can reset when the service redeploys. For a serious store, move this data to an external database such as MongoDB Atlas.

The bot also needs these server permissions:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages
- Manage Channels
- Kick Members
- Ban Members
- Moderate Members
