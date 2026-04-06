const Guild = require('../../models/guild');
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Configure server settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('mining-channel')
            .setDescription('Set or clear the channel where block spawn announcements are sent')
            .addChannelOption(opt => opt
                .setName('channel')
                .setDescription('The channel to announce block spawns in (omit to clear)')
                .setRequired(false))),
    execute: async function (interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
            return interaction.reply({ content: "You don't have permission to use this!", flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();

        if (sub === 'mining-channel') {
            const channel = interaction.options.getChannel('channel');
            const channelId = channel ? channel.id : null;

            await Guild.findOneAndUpdate(
                { id: interaction.guild.id },
                { miningChannelId: channelId },
                { upsert: true, setDefaultsOnInsert: true }
            );

            const msg = channelId
                ? `Mining announcements will be sent to <#${channelId}>.`
                : 'Mining announcement channel cleared.';

            return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
