const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Challenge someone to a dice duel')
        .addUserOption(opt => opt.setName('opponent').setDescription('The user to challenge').setRequired(true))
        .addStringOption(opt => opt.setName('bet').setDescription('Amount to bet or "allin"').setRequired(true)),
    execute: async function (interaction, client) {
        const member = interaction.options.getMember('opponent');
        if (!member || member.id === interaction.user.id || !(await User.exists({ id: member.id })))
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Not a valid player')], ephemeral: true });

        const betInput = interaction.options.getString('bet');
        let bet_value;
        if (betInput === 'allin') {
            bet_value = await User.getBalance(interaction.user.id);
            if (bet_value === 0)
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription("Can't all in 0.")], ephemeral: true });
        } else if (!betInput || isNaN(betInput) || parseInt(betInput) === 0) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')], ephemeral: true });
        } else if (await User.getBalance(interaction.user.id) < parseInt(betInput)) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins!')], ephemeral: true });
        } else {
            bet_value = parseInt(betInput);
        }

        if (client.activeDice.has(interaction.user.id) || client.activeDice.has(member.id))
            return interaction.reply({ content: 'Either you or your opponent have an active dice.', ephemeral: true });
        client.activeDice.add(interaction.user.id);
        client.activeDice.add(member.id);

        let roll_1 = Math.floor(Math.random() * 100) + 1;
        let roll_2 = Math.floor(Math.random() * 100) + 1;

        const filter = (reaction, user) => {
            return ['✔', '❌'].includes(reaction.emoji.name) && user.id === member.id;
        };

        let embedMessage = new EmbedBuilder()
            .setColor(0xAF873D)
            .setTitle('Dice Challenge')
            .setDescription(`You have challenged **${member.displayName}**. Total value in the bet: **${bet_value}** <:boriscoin:798017751842291732>`);

        const dice_message = await interaction.reply({ embeds: [embedMessage], fetchReply: true });
        await dice_message.react('✔');
        await dice_message.react('❌');

        dice_message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
            .then(async collected => {
                const reaction = collected.first();
                if (reaction.emoji.name === '✔') {
                    // Atomically deduct sender's bet now that opponent accepted
                    const senderUpdate = await User.findOneAndUpdate(
                        { id: interaction.user.id, coins: { $gte: bet_value } },
                        { $inc: { coins: -bet_value } }
                    );
                    if (!senderUpdate) {
                        await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('Challenger no longer has enough coins. Cancelled!')] });
                        client.activeDice.delete(interaction.user.id);
                        client.activeDice.delete(member.id);
                        return dice_message.reactions.removeAll();
                    }
                    if (await User.getBalance(member.id) < bet_value) {
                        await User.findOneAndUpdate({ id: interaction.user.id }, { $inc: { coins: bet_value } });
                        await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('You dont have enough coins to accept this challenge. Cancelled!')] });
                        client.activeDice.delete(interaction.user.id);
                        client.activeDice.delete(member.id);
                        return dice_message.reactions.removeAll();
                    }
                    if (roll_2 > roll_1) {
                        await new Transaction(member.id, bet_value, 'Dice').process();
                        await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${member.displayName}** won the dice with a roll of **${roll_2}** vs **${roll_1}**, and received **${bet_value}** <:boriscoin:798017751842291732>`)] });
                    } else {
                        await new Transaction(interaction.user.id, 2 * bet_value, 'Dice').process();
                        await new Transaction(member.id, -bet_value, 'Dice').process();
                        await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${interaction.user.username}** won the dice with a roll of **${roll_1}** vs **${roll_2}**, and received **${bet_value}** <:boriscoin:798017751842291732>`)] });
                    }
                } else {
                    await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${member.displayName}** declined the dice, better friends next time!`)] });
                }
                client.activeDice.delete(interaction.user.id);
                client.activeDice.delete(member.id);
                await dice_message.reactions.removeAll();
            })
            .catch(async () => {
                await dice_message.edit({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('Challenge timed out, bet not deducted.')] });
                client.activeDice.delete(interaction.user.id);
                client.activeDice.delete(member.id);
                await dice_message.reactions.removeAll();
            });
    }
};
