const { User } = require('../../models/user');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'Private',
    description: 'Switch Private Mentions',
    usage: 'private <on/off>',
    execute: async function (message, client, args) {
        await User.findOne({ id: message.author.id }).then(async user => {
            if (args[0] === 'on') {
                user.private = false;
                let embed = new EmbedBuilder()
                    .setColor(0xACA19D)
                    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                    .setTitle('You turned private messages on');
                await message.channel.send({ embeds: [embed] });
            }
            if (args[0] === 'off') {
                user.private = true;
                let embed = new EmbedBuilder()
                    .setColor(0xACA19D)
                    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                    .setTitle('You turned private messages off');
                await message.channel.send({ embeds: [embed] });
            } else {
                let embed = new EmbedBuilder()
                    .setColor(0xACA19D)
                    .setTitle('Not a valid option');
                await message.channel.send({ embeds: [embed] });
            }
            await user.save();

        });
    }
};