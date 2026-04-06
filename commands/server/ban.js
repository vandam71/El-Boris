const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban').setRequired(false)),
    execute: async function (interaction, client) {
        const member = interaction.options.getMember('user');
        if (!member)
            return interaction.reply({ content: 'Please mention a valid member of this server.', flags: MessageFlags.Ephemeral });
        if (!member.bannable)
            return interaction.reply({ content: 'I cannot ban this user! Do they have a higher role?', flags: MessageFlags.Ephemeral });

        const reason = interaction.options.getString('reason') || 'No reason provided';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ban_confirm').setLabel('Confirm Ban').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ban_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );

        const { resource: banResource } = await interaction.reply({ content: `Are you sure you want to ban **${member.user.tag}**? Reason: *${reason}*`, components: [row], flags: MessageFlags.Ephemeral, withResponse: true });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = banResource.message;
            const collected = await confirmation.awaitMessageComponent({ filter, time: 15000 });
            if (collected.customId === 'ban_confirm') {
                await member.ban({ reason });
                await collected.update({ content: `**${member.user.tag}** has been banned. Reason: *${reason}*`, components: [] });
            } else {
                await collected.update({ content: 'Ban cancelled.', components: [] });
            }
        } catch {
            await interaction.editReply({ content: 'Confirmation timed out. Ban cancelled.', components: [] });
        }
    }
};
