const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'Inspire',
    description: 'If in need of some Inspiration',
    usage: 'inspire',
    execute: async function (message, client, args) {
        const res = await fetch('https://zenquotes.io/api/random');
        const json = await res.json();
        message.channel.send({
            embeds: [new EmbedBuilder()
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setTitle(json[0].a)
                .setDescription(json[0].q)]
        });
    },
};