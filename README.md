# El Boris — v3.7.0

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
| User | inventory, peek, profile, stats |

## Roadmap — 3.x

- [x] Migrate all commands to slash commands
- [ ] Vote kick from voice channel
- [x] Poll system
- [x] Teams (create, join, delete, stats)
- [x] Mining blocks with bonus drops
- [ ] Fishing command + sell fish
- [x] Scratch Card
- [ ] Inventory sorting / keyword filtering
- [ ] Quests (fish x, mine x, slots x)
- [ ] Some kind of prestige system
- [x] Stats (nr of casino types done, one for slots, one for specialslots, etc, nr of mines, nr of upgrades, nr of blocks mined, basically needs to be tracked in the user)

## Changelog
**v3.7.0**
- Block destroyed embed now shows per-miner coin payouts ("💰 Rewards" field replaces miner list on block end)
- `/boriscoin` redesigned as an info embed with Earn / Spend / View fields
- Highscores switched to embed list format (mobile-friendly, removes ASCII table)
- Dice and Upgrade challenges now use buttons instead of emoji reactions
- Fixed slots payout amounts in embed matching actual transaction values
- Scratchcard: minimum win raised to 4 matching symbols; added 15-second per-user cooldown
- All command cooldowns centralised in `config.json` (`slots_cooldown`, `special_slots_cooldown`, `scratchcard_cooldown`, `poke_cooldown`, `azia_cooldown`)

**v3.6.0**
- Added `/stats [user]` — categorised embed showing win rates, lifetime coins earned, mining totals, chest and upgrade counts; respects `private` flag
- Tracks stats across all games and actions: slots, special slots, blackjack, coinflip, dice, scratchcard, mine solo, block mining, chests, perk upgrades
- Stats stored as a `stats` subdocument on each User; all counters default to 0 so existing users are unaffected
- Tracking uses atomic `$inc` at each outcome point (fire-and-forget, never blocks gameplay)

**v3.5.0**
- Added `/configure mining-channel` — set a channel per guild to receive block spawn announcements
- Block destroyed embed announces per-channel with a fan-out to all configured mining channels
- Added `/dev spawnblock [type]` to force-spawn a block of a specific tier for testing
- Added `/dev settick <seconds>` to change the block tick interval at runtime
- Block tick refactored to recursive `setTimeout` with damage jitter and spawn jitter

**v3.4.0**
- Added `/team` with 6 subcommands: `create` (costs 2000 coins), `invite` (in-channel button flow, 5 min expiry), `kick`, `leave`, `disband`, `info` (total level + total networth)
- Team tag `[TAG]` shown in `/profile` title
- Teams are stored in MongoDB; invite Accept/Decline buttons are restart-resilient (handled globally)

**v3.3.0**
- Added `/mine block` — global cooperative mining blocks; 4 tiers (Stone/Iron/Gold/Diamond) with scaling HP and reward pools; every player gets their own live embed with HP bar and miner list; ⛏️ Join / 🏃 Leave buttons update all messages across all servers in real time; damage per tick scales with Speed Perk; Luck Perk boosts your share of the reward; must be mining at the end to receive a payout; new block spawns automatically after cooldown
- Added member sync on startup — all existing server members are created in the DB when the bot starts, when it joins a new guild, or when a new member joins

**v3.2.2**
- Added `/poll` — modal-based poll creator; type question and options (one per line, 2–9); live vote bar with percentages; toggle/switch votes; auto-closes with winner announced

**v3.2.1**
- Fixed item emotes being double-wrapped (`<<:name:id>>`) — emote field is now stored as the full `<:name:id>` string and rendered directly
- Added `additem` and `removeitem` subcommands to `/dev` for managing shop items without code changes

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