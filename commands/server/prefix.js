const Guild = require('../../models/guild');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change the bot prefix for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addStringOption(opt => opt.setName('new_prefix').setDescription('New prefix character').setRequired(true)),
    execute: async function (interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
            return interaction.reply({ content: "You don't have permissions to use this!", ephemeral: true });

        const new_prefix = interaction.options.getString('new_prefix');

        await Guild.findOneAndUpdate({ id: interaction.guild.id }, { prefix: new_prefix });
        return interaction.reply(`Prefix changed to \`${new_prefix}\``);
    }
};
