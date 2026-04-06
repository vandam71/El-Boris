const { Client, GatewayIntentBits } = require('discord.js');
const appConfig = require('../config.json');

module.exports = class extends Client {
    constructor(config) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
            ]
        });

        // project wise variables
        this.activeDice = new Set();
        this.pokedRecently = new Set();
        // cooldown Maps: id -> expireTimestamp (ms)
        this.minedRecently = new Map();

        // block spawn schedule: epoch ms, or Infinity when a block is active
        this.nextBlockSpawn = null;
        // block tick interval in seconds (overridable at runtime via /dev settick)
        this.blockTickInterval = appConfig.block_tick_interval;
        this.chestRecently = new Map();
        this.flipRecently = new Map();
        this.slotsRecently = new Map();
        this.specialSlotsRecently = new Map();

        // dev mode global flag
        this.devMode = false;

        // bot configs
        this.config = config;
    }
}