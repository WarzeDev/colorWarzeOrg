# color.Warze.org

A small, open source Discord bot that gives every new member a **random color role named after their username**, and lets them change it any time with `/role`.

Built with [discord.js](https://discord.js.org) and [Bun](https://bun.sh). Role ownership is stored in SQLite (via Bun's built-in `bun:sqlite`), so there are no native modules to compile.

## Features

- **Automatic role on join.** A new role is created with the member's Discord username as its name and a random, readable color, then assigned to them.
- **Welcome embed.** The bot posts in the channel where Discord shows the join message (your server's system messages channel), colored with the new role:
  > Welcome to **Server** you are member **#42**. You were given @username with a random color, but you can change it with /role
- **`/role [name] [code]`.** Members change their own role's name, color, or both. `code` is a hex color such as `#ff8800` or `f80`. The reply is an embed in the role's new color.
- **SQLite-backed.** The bot stores which role belongs to which member, so `/role` always edits the right role. If a member has no stored role (they joined before the bot did) or their role was deleted, `/role` creates a fresh one.
- **Tidy.** When a member leaves, their role is deleted so you don't run into Discord's limit of 250 roles per server.

## Requirements

- [Bun](https://bun.sh) 1.1 or newer
- A Discord application with a bot user

## Setup

### 1. Create the bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open **Bot**, then copy the token.
3. On the same page, enable the **Server Members Intent** (it is privileged and required to see joins and leaves).

### 2. Invite it to your server

Replace `YOUR_CLIENT_ID` with your application's ID (**General Information**):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=268454912
```

That permission set is: View Channel, Send Messages, Embed Links, Manage Roles.

### 3. Run it

```bash
git clone https://github.com/WarzeDev/colorWarzeOrg.git
cd colorWarzeOrg
bun install
cp .env.example .env   # then paste your token into .env
bun run start
```

Bun loads `.env` automatically. Slash commands are registered globally when the bot starts.

## Configuration

| Variable        | Required | Default          | Description                       |
| --------------- | -------- | ---------------- | --------------------------------- |
| `DISCORD_TOKEN` | yes      |                  | Your bot token                    |
| `DATABASE_PATH` | no       | `./color.sqlite` | Where the SQLite database is kept |

## Important: role hierarchy

Discord only lets a bot manage roles **below its own highest role**. In **Server Settings → Roles**, drag the bot's role above the member color roles it will create. New roles are created at the bottom of the list, so placing the bot's role near the top is enough.

Also, a member's name color comes from their highest colored role. If members have other colored roles ranked above their personal one, that role's color wins.

## How it works

| Event / command      | What happens                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Member joins         | Create role (`username`, random color), assign it, save `guild_id + user_id → role_id`, welcome |
| `/role name code`    | Look up the stored role id, edit the role, reply with an embed in the new color                |
| Member leaves        | Delete their role and database row                                                              |

Database schema:

```sql
CREATE TABLE member_roles (
  guild_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  role_id  TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);
```

## Project layout

```
src/
  index.ts    bot, event handlers, /role command
  db.ts       SQLite access
  colors.ts   random color generation and hex parsing
```

## Notes

- Bots that join are skipped.
- The member number is the server's member count at the moment of joining, which includes bots.
- If your server has system messages turned off, the role is still created but no welcome message is sent.
- Don't want roles deleted when members leave? Remove the `GuildMemberRemove` handler in `src/index.ts`.

## Contributing

Issues and pull requests are welcome. Keep changes small and focused, and run `bun run start` against a test server before opening a PR.

## License

[MIT](LICENSE)
