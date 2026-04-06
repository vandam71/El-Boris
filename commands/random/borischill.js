const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borischill')
        .setDescription('Boris is chillin'),
    execute: async function (interaction, client) {
        return interaction.reply('https://i.imgur.com/B6gebu9.png');
    }
};
