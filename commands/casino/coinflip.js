const { EmbedBuilder } = require("discord.js");
const { User } = require("../../models/user");
const Transaction = require("../../struct/Transaction");
const flipRecently = new Set();

module.exports = {
    name: 'Coin Flip',
    description: 'Flip a coin with 50% chance of winning',
    usage: 'coinflip <tails/heads> <value>',
    execute: async function (message, client, args) {
        if (!['tails', 'heads'].includes(args[0])) return message.channel.send({ embeds: [new EmbedBuilder().setDescription('Which side of the coin do you want to pick?')] });
        let bet_value;
        if (args[1] === 'allin') {
            bet_value = await User.getBalance(message.author.id);
            if (bet_value === 0) {
                return message.channel.send({ embeds: [new EmbedBuilder().setDescription("Can't all in 0.")] });
            }
        } else if (!args[1] || isNaN(args[1]) || parseInt(args[1]) === 0) {
            return message.channel.send({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')] });
        } else if (await User.getBalance(message.author.id) < parseInt(args[1])) {
            return message.channel.send({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins!')] });
        } else {
            bet_value = parseInt(args[1]);
        }

        if (flipRecently.has(message.author.id))
            return message.reply('command has a 5 seconds cooldown.');
        flipRecently.add(message.author.id);
        setTimeout(() => {
            flipRecently.delete(message.author.id);
        }, (5 * 1000));

        let flipMessage = new EmbedBuilder()
            .setColor(0xD8BFD8)
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle('Coin Flip 🪙');

        let coin = ((Math.round(Math.random()) === 0) ? 'heads' : 'tails');

        switch (args[0]) {
            case 'heads':
                if (coin === "heads") {
                    // Picked heads and won
                    await new Transaction(message.author.id, bet_value, 'Coinflip').process();
                    flipMessage.setDescription('You flip a coin, and it lands on Heads. You won ' + bet_value + " <:boriscoin:798017751842291732>.");
                    return message.channel.send({ embeds: [flipMessage] });
                } else {
                    // Picked heads and lost
                    await new Transaction(message.author.id, -bet_value, 'Coinflip').process();
                    flipMessage.setDescription('You flip a coin, and it lands on Tails. You lost ' + bet_value + " <:boriscoin:798017751842291732>.");
                    return message.channel.send({ embeds: [flipMessage] });
                }
            case 'tails':
                if (coin === "tails") {
                    // Picked tails and won
                    await new Transaction(message.author.id, bet_value, 'Coinflip').process();
                    flipMessage.setDescription('You flip a coin, and it lands on Tails. You won ' + bet_value + " <:boriscoin:798017751842291732>.");
                    return message.channel.send({ embeds: [flipMessage] });
                } else {
                    // Picked tails and lost
                    await new Transaction(message.author.id, -bet_value, 'Coinflip').process();
                    flipMessage.setDescription('You flip a coin, and it lands on Heads. You lost ' + bet_value + " <:boriscoin:798017751842291732>.");
                    return message.channel.send({ embeds: [flipMessage] });
                }
        }
    }
}