const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban').setRequired(false)),
    execute: async function (interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
            return interaction.reply({ content: "You don't have permissions to use this!", ephemeral: true });

        const member = interaction.options.getMember('user');
        if (!member)
            return interaction.reply({ content: 'Please mention a valid member of this server.', ephemeral: true });
        if (!member.bannable)
            return interaction.reply({ content: 'I cannot ban this user! Do they have a higher role?', ephemeral: true });

        const reason = interaction.options.getString('reason') || 'No reason provided';

        await member.ban({ reason })
            .then(() => interaction.reply(`${member.user.tag} has been banned by ${interaction.user.tag} because: ${reason}`))
            .catch(e => interaction.reply({ content: `I couldn't ban because of: ${e}`, ephemeral: true }));
    }
};
