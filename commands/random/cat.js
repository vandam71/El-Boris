const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Random Cat Picture'),
    execute: async function (interaction, client) {
        await interaction.deferReply();
        const res = await fetch('https://aws.random.cat/meow');
        const json = await res.json();
        return interaction.editReply(json.file);
    }
};
