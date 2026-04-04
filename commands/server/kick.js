const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick').setRequired(false)),
    execute: async function (interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
            return interaction.reply({ content: "You don't have permissions to use this!", ephemeral: true });

        const member = interaction.options.getMember('user');
        if (!member)
            return interaction.reply({ content: 'Please mention a valid member of this server.', ephemeral: true });
        if (!member.kickable)
            return interaction.reply({ content: 'I cannot kick this user! Do they have a higher role?', ephemeral: true });

        const reason = interaction.options.getString('reason') || 'No reason provided';

        await member.kick(reason)
            .then(() => interaction.reply(`${member.user.tag} has been kicked by ${interaction.user.tag} because: ${reason}`))
            .catch(e => interaction.reply({ content: `I couldn't kick because of: ${e}`, ephemeral: true }));
    }
};
