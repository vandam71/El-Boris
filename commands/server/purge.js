const { SlashCommandBuilder, PermissionFlagsBits ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of messages from this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt => opt
            .setName('count')
            .setDescription('Number of messages to delete (2-100)')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(100)),
    execute: async function (interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const count = interaction.options.getInteger('count');
        try {
            const messages = await interaction.channel.bulkDelete(count, true);
            await interaction.editReply(`Bulk deleted ${messages.size} messages.`);
        } catch (error) {
            await interaction.editReply(`Couldn't delete messages: ${error.message}`);
        }
    }
};
