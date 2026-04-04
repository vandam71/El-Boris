# El Boris — v3.0.0

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
| Casino | blackjack, coinflip, dice, slots, specialslots |
| Dev | dev, help, release |
| Gaming | opgg |
| Random | azia, borischill, casinha, cat, die, discord, fistbump, giphy, highscores, inspire, levelup, nsfw, ping, private, say, suggestion |
| Roles | role |
| Server | ban, kick, poke, poll, prefix, purge, votekick |
| Shop | buy, info, shop, upgrade |
| Team | team |
| User | inventory, peek, profile |

## Roadmap — 3.x

- [ ] Migrate all commands to slash commands
- [ ] Vote kick from voice channel
- [ ] Poll system
- [ ] Teams (create, join, delete, stats)
- [ ] Mining blocks with bonus drops
- [ ] Fishing command + sell fish
- [ ] Scratch Card
- [ ] Inventory sorting / keyword filtering
- [ ] Quests (fish x, mine x, slots x)
- [ ] Some kind of prestige system

## Changelog

**v3.0.0**
- Upgraded discord.js v13 → v14 (EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, ActivityType)
- Upgraded mongoose v6 → v8, axios v0.26 → v1, nodemon v2 → v3
- Replaced all deprecated npm packages with Node 20 built-in `fetch`
- Fixed guild sync on bot ready (handles DB resets gracefully)
- Removed audio dependencies (incompatible with Node 20)
- 0 npm audit vulnerabilities

**v2.7.8**
- Hotfix: coinflip command