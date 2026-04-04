const { EmbedBuilder } = require("discord.js");
const { User } = require("../../models/user");
const Transaction = require("../../struct/Transaction");
const slotsRecently = new Set();

module.exports = {
    name: '7 Slots - 15 seconds cooldown',
    description: '**Win** - **Combination**\n30 - 3 Jokers 🎰 🎰 🎰\n10 - Any 3 Fruit 🍎 🍇 🍋 🍌 🍒\n4 - Any 2 Jokers 🎰 🎰\n1 - Any 1 Joker 🎰',
    usage: 'slots <value>',
    execute: async function (message, client, args) {
        let bet_value;
        if (args[0] === 'allin') {
            bet_value = await User.getBalance(message.author.id);
            if (bet_value === 0) {
                return message.channel.send({ embeds: [new EmbedBuilder().setDescription("Can't all in 0.")] });
            }
        } else if (!args[0] || isNaN(args[0]) || parseInt(args[0]) === 0) {
            return message.channel.send({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')] });
        } else if (await User.getBalance(message.author.id) < parseInt(args[0])) {
            return message.channel.send({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins!')] });
        } else {
            bet_value = parseInt(args[0]);
        }

        if (slotsRecently.has(message.author.id))
            return message.reply('command has a 15 second cooldown.');
        slotsRecently.add(message.author.id);
        setTimeout(() => {
            slotsRecently.delete(message.author.id);
        }, (15 * 1000));

        let items = ['🎰', '🍎', '🍇', '🍋', '🍌', '🍒'];

        let $ = items[Math.floor(items.length * Math.random())];
        let $$ = items[Math.floor(items.length * Math.random())];
        let $$$ = items[Math.floor(items.length * Math.random())];

        // 3 Jokers -> win 30
        // 3 Fruit -> win 10
        // 2 Jokers -> win 4
        // 1 Joker -> win 1

        if ($ === $$ && $ === $$$) {
            if ($ === '🎰') {
                await new Transaction(message.author.id, bet_value * 29, 'Slots').process();
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle("Slot Machine")
                        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                        .setDescription(`• ${$}  ${$$}  ${$$$} •`)
                        .addFields({ name: 'Jackpot!', value: "Big win! You won " + bet_value * 30 + " <:boriscoin:798017751842291732>." })
                        .setColor(0xAF873D)]
                });
            } else {
                await new Transaction(message.author.id, bet_value * 9, 'Slots').process();
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle("Slot Machine")
                        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                        .setDescription(`• ${$}  ${$$}  ${$$$} •`)
                        .addFields({ name: '3 of a kind!', value: "You won " + bet_value * 10 + " <:boriscoin:798017751842291732>." })
                        .setColor(0xAF873D)]
                });
            }
        } else if (($ === $$ || $ === $$$) && ($ === '🎰') || (($$ === $$$) && ($$ === '🎰'))) {
            await new Transaction(message.author.id, bet_value * 3, 'Slots').process();
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("Slot Machine")
                    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                    .setDescription(`• ${$}  ${$$}  ${$$$} •`)
                    .addFields({ name: '2 Jokers!', value: "You won " + bet_value * 4 + " <:boriscoin:798017751842291732>." })
                    .setColor(0xAF873D)]
            });
        } else if ($ === '🎰' || $$ === '🎰' || $$$ === '🎰') {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("Slot Machine")
                    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                    .setDescription(`• ${$}  ${$$}  ${$$$} •`)
                    .addFields({ name: '1 Joker!', value: "You break even!" })
                    .setColor(0xAF873D)]
            });
        } else {
            await new Transaction(message.author.id, -bet_value, 'Slots').process();
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("Slot Machine")
                    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                    .setDescription(`• ${$}  ${$$}  ${$$$} •`)
                    .addFields({ name: 'Lost...', value: "Better luck next time." })
                    .setColor(0xAF873D)]
            });
        }
    }
}