const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { casinha } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casinha')
        .setDescription('Get the invite for the Casinha do Povo server'),
    execute: async function (interaction, client) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xACA19D)
                .setTitle('Casinha do Povo 2.0')
                .setThumbnail(client.user.avatarURL())
                .setDescription('The only El Boris sponsored discord community, join now!')
                .addFields({ name: 'Link', value: casinha })]
        });
    }
};
