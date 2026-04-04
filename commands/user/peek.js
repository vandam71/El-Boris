const { User } = require('../../models/user');
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'Peek',
    description: 'Look at a user profile',
    usage: 'peek <user tag>',
    execute: async function (message, client, args) {
        let member = message.mentions.members.first();
        let user = await User.findOne({ id: member.user.id });
        if (user === null) {
            return message.reply("This user has no profile!");
        }
        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle(`${member.user.username} Profile`)
            .addFields({ name: "Stats", value: `**Level: ${user.level}**\nAzia: **${user.azia}**` })
            .setThumbnail(member.user.avatarURL());
        return message.channel.send({ embeds: [embed] });
    }
};