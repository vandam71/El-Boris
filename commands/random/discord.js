const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { invite } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('discord')
        .setDescription('Get the invite for the official bot server'),
    execute: async function (interaction, client) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xACA19D)
                .setTitle('Discord server invite')
                .setThumbnail(client.user.avatarURL())
                .addFields({ name: 'Link', value: invite })]
        });
    }
};
