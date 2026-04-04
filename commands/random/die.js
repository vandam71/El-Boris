const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('die')
        .setDescription('You die'),
    execute: async function (interaction, client) {
        return interaction.reply('https://imgur.com/a/UJFdQCm');
    }
};
