const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick').setRequired(false)),
    execute: async function (interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
            return interaction.reply({ content: "You don't have permissions to use this!", flags: MessageFlags.Ephemeral });

        const member = interaction.options.getMember('user');
        if (!member)
            return interaction.reply({ content: 'Please mention a valid member of this server.', flags: MessageFlags.Ephemeral });
        if (!member.kickable)
            return interaction.reply({ content: 'I cannot kick this user! Do they have a higher role?', flags: MessageFlags.Ephemeral });

        const reason = interaction.options.getString('reason') || 'No reason provided';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('kick_confirm').setLabel('Confirm Kick').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('kick_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: `Are you sure you want to kick **${member.user.tag}**? Reason: *${reason}*`, components: [row], flags: MessageFlags.Ephemeral });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await interaction.fetchReply();
            const collected = await confirmation.awaitMessageComponent({ filter, time: 15000 });
            if (collected.customId === 'kick_confirm') {
                await member.kick(reason);
                await collected.update({ content: `**${member.user.tag}** has been kicked. Reason: *${reason}*`, components: [] });
            } else {
                await collected.update({ content: 'Kick cancelled.', components: [] });
            }
        } catch {
            await interaction.editReply({ content: 'Confirmation timed out. Kick cancelled.', components: [] });
        }
    }
};
