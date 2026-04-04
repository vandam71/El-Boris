const { Client, GatewayIntentBits } = require('discord.js');

module.exports = class extends Client {
    constructor(config) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
            ]
        });

        // project wise variables
        this.activeDice = new Set();
        this.pokedRecently = new Set();
        this.minedRecently = new Set();
        this.chestRecently = new Set();

        // dev mode global flag
        this.devMode = false;

        // bot configs
        this.config = config;
    }
}