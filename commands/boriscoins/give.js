const { EmbedBuilder } = require("discord.js");
const { User } = require("../../models/user");
const Transaction = require('../../struct/Transaction');

module.exports = {
    name: 'Give',
    description: 'Give coins to someone',
    usage: 'give <user tag> <value>',
    execute: async function (message, client, args) {
        let member = message.mentions.members.first();
        if (member === undefined || member.id === message.author.id || !(await User.exists({ id: member.id }))) return message.channel.send({ embeds: [new EmbedBuilder().setDescription('Not a valid user')] });
        if (!args[1] || isNaN(args[1])) return message.channel.send({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')] });

        let give_value = parseInt(args[1]);
        if (await User.getBalance(message.author.id) < give_value) return message.channel.send({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins to give')] });

        await new Transaction(message.author.id, -give_value, 'Give').process();
        await new Transaction(member.id, give_value, 'Give').process();

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0xAF873D)
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setTitle('Give')
                .setDescription(`You gave ${member.displayName} ${give_value} <:boriscoin:798017751842291732>`)]
        });
    }
}