const { EmbedBuilder } = require('discord.js');
const { User } = require("../../models/user");
const Transaction = require('../../struct/Transaction');

module.exports = {
    name: 'Dice',
    description: 'Dice command to challenge your friends',
    usage: 'dice <user tag> <value>',
    execute: async function (message, client, args) {
        let member = message.mentions.members.first();
        if (member === undefined || member.id === message.author.id || !(await User.exists({ id: member.id }))) return message.channel.send({ embeds: [new EmbedBuilder().setDescription('Not a valid player')] });
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
        // Active Dice check
        if (client.activeDice.has(message.author.id) || client.activeDice.has(member.id))
            return message.reply('either you or your opponent have an active dice');
        client.activeDice.add(message.author.id);
        client.activeDice.add(member.id);

        await new Transaction(message.author.id, -bet_value, 'Dice').process();

        let roll_1 = Math.floor(Math.random() * 100) + 1;
        let roll_2 = Math.floor(Math.random() * 100) + 1;

        const filter = (reaction, user) => {
            return ['✔', '❌'].includes(reaction.emoji.name) && user.id === member.id;
        }

        let embedMessage = new EmbedBuilder()
            .setColor(0xAF873D)
            .setTitle('Dice Challenge')
            .setDescription(`You have challenged **${member.displayName}**. Total value in the bet: **${bet_value}** <:boriscoin:798017751842291732>`);

        message.channel.send({ embeds: [embedMessage] }).then(async dice_message => {
            await dice_message.react('✔');
            await dice_message.react('❌');

            dice_message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(async collected => {
                    const reaction = collected.first();

                    if (reaction.emoji.name === '✔') {
                        if (await User.getBalance(member.id) < bet_value) {
                            await new Transaction(message.author.id, bet_value, 'Dice').process();
                            await dice_message.edit({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xAF873D)
                                    .setTitle('Dice Challenge')
                                    .setDescription(`You dont have enough coins to accept this challenge. Cancelled!`)]
                            });
                            // remove from active
                            client.activeDice.delete(message.author.id);
                            client.activeDice.delete(member.id);
                            return dice_message.reactions.removeAll();
                        }
                        if (roll_2 > roll_1) {
                            await new Transaction(member.id, bet_value, 'Dice').process();
                            await dice_message.edit({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xAF873D)
                                    .setTitle('Dice Challenge')
                                    .setDescription(`**${member.displayName}** won the dice with a roll of **${roll_2}** vs **${roll_1}**, and received **${bet_value}** <:boriscoin:798017751842291732>`)]
                            });
                        } else {
                            await new Transaction(message.author.id, 2 * bet_value, 'Dice').process();
                            await new Transaction(member.id, -bet_value, 'Dice').process();
                            await dice_message.edit({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xAF873D)
                                    .setTitle('Dice Challenge')
                                    .setDescription(`**${message.author.username}** won the dice with a roll of **${roll_1}** vs **${roll_2}**, and received **${bet_value}** <:boriscoin:798017751842291732>`)]
                            });
                        }
                    } else {
                        await new Transaction(message.author.id, bet_value, 'Dice').process();
                        await dice_message.edit({
                            embeds: [new EmbedBuilder()
                                .setColor(0xAF873D)
                                .setTitle('Dice Challenge')
                                .setDescription(`**${member.displayName}** declined the dice, better friends next time!`)]
                        });
                    }
                    // remove from active
                    client.activeDice.delete(message.author.id);
                    client.activeDice.delete(member.id);
                    await dice_message.reactions.removeAll();
                })
                .catch(async err => {
                    await new Transaction(message.author.id, bet_value, 'Dice').process();
                    await dice_message.edit({
                        embeds: [new EmbedBuilder()
                            .setColor(0xAF873D)
                            .setTitle('Dice Challenge')
                            .setDescription(`The Challenge has expired!`)]
                    });
                    // remove from active
                    client.activeDice.delete(message.author.id);
                    client.activeDice.delete(member.id);
                    await dice_message.reactions.removeAll();
                });
        });
    }
};