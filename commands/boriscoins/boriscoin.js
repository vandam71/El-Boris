const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boriscoin')
        .setDescription('What is BorisCoin'),
    execute: async function (interaction, client) {
        await interaction.reply('<:boriscoin:798017751842291732>');
    }
};
