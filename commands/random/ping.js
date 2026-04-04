const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'Ping',
    description: 'Returns the Latency from the server and API',
    usage: 'ping',
    execute: async function (message, client, args) {
        let embed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setDescription(`Pong! Latency is ${Date.now() - message.createdAt}ms. API Latency is ${Math.round(client.ws.ping)}ms`);

        return message.channel.send({ embeds: [embed] });
    },
};