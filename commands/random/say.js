const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Makes the bot say a sentence')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addStringOption(opt => opt.setName('text').setDescription('Text to say').setRequired(true)),
    execute: async function (interaction, client) {
        const sayMessage = interaction.options.getString('text');
        await interaction.channel.send(sayMessage);
        await interaction.reply({ content: '✅', flags: MessageFlags.Ephemeral });
    }
};
