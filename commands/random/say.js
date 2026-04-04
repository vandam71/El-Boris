const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Makes the bot say a sentence')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addStringOption(opt => opt.setName('text').setDescription('Text to say').setRequired(true)),
    execute: async function (interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
            return interaction.reply({ content: 'te fuder, não mandas no bot!', ephemeral: true });
        const sayMessage = interaction.options.getString('text');
        await interaction.channel.send(sayMessage);
        await interaction.reply({ content: '✅', ephemeral: true });
    }
};
