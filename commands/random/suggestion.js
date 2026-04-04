const Suggestions = require('../../models/suggestions');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'Suggestion',
    description: 'Makes a suggestion to the developer',
    usage: 'suggestion <sentence>',
    execute: async function (message, client, args) {
        const sayMessage = args.join(' ');
        await Suggestions.create({ name: message.author.username, id: message.author.id, suggestion: sayMessage });

        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0xAAFF00)
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setTitle('Suggestion')
                .setDescription(`your suggestion has been recorded!`)]
        });
    }
};