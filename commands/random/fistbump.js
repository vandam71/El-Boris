const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fistbump')
        .setDescription('Fist bumps someone'),
    execute: async function (interaction, client) {
        return interaction.reply('https://i.imgur.com/oL0XUD8.png');
    }
};
