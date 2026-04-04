const { User } = require('../../models/user');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'Level Up',
    description: 'Check how much XP you need to level up',
    usage: 'levelup',
    execute: async function (message, client, args) {
        await User.findOne({ id: message.author.id }).then(async user => {

            let req_xp = 69 * (user.level + 1) * (1 + (user.level + 1));

            let embed = new EmbedBuilder()
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setColor(0xACA19D)
                .setTitle("You're almost there")
                .setDescription(`You still need ${req_xp - user.xp} xp to reach level ${user.level + 1}. Keep spamming!`);

            return message.channel.send({ embeds: [embed] });
        });
    }
};