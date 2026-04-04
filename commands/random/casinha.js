const { EmbedBuilder } = require('discord.js');
const { casinha } = require('../../config.json');

module.exports = {
    name: 'Casinha',
    description: 'Get the invite for the Casinha do Povo server',
    usage: 'casinha',
    execute: async function (message, client, args, commands) {

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0xACA19D)
                .setTitle('Casinha do Povo 2.0')
                .setThumbnail(client.user.avatarURL())
                .setDescription('The only El Boris sponsored discord community, join now!')
                .addFields({ name: 'Link', value: casinha })]
        })
    }
};