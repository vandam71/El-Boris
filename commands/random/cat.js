const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Random Cat Picture'),
    execute: async function (interaction, client) {
        const res = await fetch('https://aws.random.cat/meow');
        const json = await res.json();
        return interaction.reply(json.file);
    }
};
