# El Boris — v3.2.0

A Discord bot built with discord.js v14, Node.js v20, and MongoDB (Mongoose v8).

## Stack

- **discord.js** 14.x (slash commands, EmbedBuilder, GatewayIntentBits)
- **mongoose** 8.x
- **Node.js** 20.x
- **nodemon** 3.x (dev)

## Setup

1. Copy `.env.example` → `.env` and fill in `TOKEN`, `MONGO_URI`, `PREFIX`
2. `npm install`
3. `npm run dev` (nodemon) or `npm start`

## Commands

| Category | Commands |
|---|---|
| BorisCoins | boriscoin, chest, give, mine |
| Casino | blackjack, coinflip, dice, scratchcard, slots, specialslots |
| Dev | dev, help, release |
| Gaming | opgg |
| Random | azia, borischill, casinha, cat, die, discord, fistbump, giphy, highscores, inspire, levelup, nsfw, ping, private, say, suggestion |
| Roles | role |
| Server | ban, kick, poke, poll, prefix, purge, votekick |
| Shop | buy, info, shop, upgrade |
| Team | team |
| User | inventory, peek, profile |

## Roadmap — 3.x

- [x] Migrate all commands to slash commands
- [ ] Vote kick from voice channel
- [ ] Poll system
- [ ] Teams (create, join, delete, stats)
- [ ] Mining blocks with bonus drops
- [ ] Fishing command + sell fish
- [x] Scratch Card
- [ ] Inventory sorting / keyword filtering
- [ ] Quests (fish x, mine x, slots x)
- [ ] Some kind of prestige system

## Changelog

**v3.2.0**
- Added `/scratchcard` — 3×3 grid scratch card, costs 50 coins; scratch one row at a time or reveal all; match symbols to win up to 20× bet
- Added `/blackjack` — full blackjack vs dealer with Hit/Stand buttons, 60s timeout, handles naturals, bust and push
- Restored `/dev` as a proper slash command with subcommands: `mode`, `emojis`, `give`, `setlevel`
- Fixed global slash commands being left stale on restart — now cleared and re-registered per guild on startup
- Fixed per-guild command registration running on `guildCreate` so new guilds get commands immediately
- Fixed `/dev` crashing when invoked without a subcommand (`getSubcommand(false)` + null guard)
- Fixed `inventory.id` unique index causing E11000 duplicate key errors — removed `unique: true` from itemSchema and dropped the live index
- Replaced all deprecated `ephemeral: true` with `flags: MessageFlags.Ephemeral` across all commands
- Replaced all deprecated `fetchReply: true` with `withResponse: true` across all commands
- Updated all custom emoji IDs to match new server emojis (boriscoin, xp, keys, gems, perks)
- Improved `/slots` and `/specialslots`: reveal reels one at a time with `[ emoji ]` slot-window format
- Improved `/scratchcard`: per-row scratch buttons, live match preview while scratching

**v3.1.0**
- Fixed `clientReady` → `ready` (correct discord.js v14 event name — startup was silently broken)
- Fixed `chest.js` double `module.exports` that overwrote the slash command definition
- Fixed `specialslots.js` shuffle-based sampling that made jackpots mathematically impossible
- Fixed `private.js` on/off logic being inverted; added `private` field to user schema
- Fixed `guildMemberAdd` crash: `.cache.findOne()` doesn't exist, replaced with `.cache.find()` + null guard
- Fixed `Transaction.process()` mixed `await`/`.then()` anti-pattern; audit record now skipped if user not found
- Fixed `give.js` TOCTOU race: balance check + deduction are now atomic via `findOneAndUpdate` with `$gte`
- Fixed `dice.js` bet being deducted before opponent accepts; deduction deferred to acceptance
- Fixed `buy.js` `save()` not awaited and item being added before coins deducted
- Fixed `upgrade.js` inner `User.findOne().then()` not awaited; reactions cleared before DB writes
- Fixed `mine.js` speed perk allowing zero/negative delay; capped at 5s minimum
- Fixed all schemas storing Discord IDs as `Number` (BigInt precision loss) — changed to `String`
- Added `messageCreate` top-level try/catch
- Added `.catch()` with `process.exit(1)` to `mongoose.connect()` and `client.login()`
- Added null guards to `User.getPerks`, `User.getBalance`, `User.checkInventory`, `User.removeItem`
- Added null guards to `Item.getItemString` and `Item.getCategory`
- Fixed `chest.js` `removeItem()`, `addExperience()`, `save()` not awaited
- Added try/catch in `mine.js` `setTimeout` callback to prevent silent failures
- Fixed `azia.js` cooldown being applied before validating the target user exists

**v3.0.2**
- Fixed `ready` → `clientReady` deprecation warning (discord.js v14 prep for v15)
- Improved slash command registration logging (app ID + guild ID)
- Fixed slash command error message to include guild ID

**v3.0.1**
- Migrated all commands to slash commands (`/command` format)
- Added `interactionCreate` handler with guild-scoped slash registration
- Removed prefix-based command handling for user-facing commands
- Fixed `server_id` precision issue in config (BigInt-safe string)

**v3.0.0**
- Upgraded discord.js v13 → v14 (EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, ActivityType)
- Upgraded mongoose v6 → v8, axios v0.26 → v1, nodemon v2 → v3
- Replaced all deprecated npm packages with Node 20 built-in `fetch`
- Fixed guild sync on bot ready (handles DB resets gracefully)
- Removed audio dependencies (incompatible with Node 20)
- 0 npm audit vulnerabilities

**v2.7.8**
- Hotfix: coinflip command