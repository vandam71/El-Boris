const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fistbump')
        .setDescription('Fist bumps someone')
        .addUserOption(opt => opt.setName('user').setDescription('User to fistbump').setRequired(false)),
    execute: async function (interaction, client) {
        const target = interaction.options.getUser('user');
        const mention = target ? `<@${target.id}> ` : '';
        return interaction.reply(`${mention}https://i.imgur.com/oL0XUD8.png`);
    }
};
