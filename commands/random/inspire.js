const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Get an inspirational quote'),
    execute: async function (interaction, client) {
        const res = await fetch('https://zenquotes.io/api/random');
        const json = await res.json();
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle(json[0].a)
                .setDescription(json[0].q)]
        });
    },
};
