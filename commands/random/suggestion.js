const Suggestions = require('../../models/suggestions');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Make a suggestion to the developer')
        .addStringOption(opt => opt.setName('text').setDescription('Your suggestion').setRequired(true)),
    execute: async function (interaction, client) {
        const sayMessage = interaction.options.getString('text');
        await Suggestions.create({ name: interaction.user.username, id: interaction.user.id, suggestion: sayMessage });
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xAAFF00)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Suggestion')
                .setDescription('your suggestion has been recorded!')]
        });
    }
};
