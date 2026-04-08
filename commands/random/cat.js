const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Get a random cat picture'),
    execute: async function (interaction, client) {
        await interaction.deferReply();
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const json = await res.json();
        return interaction.editReply(json[0].url);
    }
};
