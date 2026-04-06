const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');
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
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Not a valid player')], flags: MessageFlags.Ephemeral });

        const betInput = interaction.options.getString('bet');
        let bet_value;
        if (betInput === 'allin') {
            bet_value = await User.getBalance(interaction.user.id);
            if (bet_value === 0)
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription("Can't all in 0.")], flags: MessageFlags.Ephemeral });
        } else if (!betInput || isNaN(betInput) || parseInt(betInput) < 1) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')], flags: MessageFlags.Ephemeral });
        } else if (await User.getBalance(interaction.user.id) < parseInt(betInput)) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins!')], flags: MessageFlags.Ephemeral });
        } else {
            bet_value = parseInt(betInput);
        }

        if (client.activeDice.has(interaction.user.id) || client.activeDice.has(member.id))
            return interaction.reply({ content: 'Either you or your opponent have an active dice.', flags: MessageFlags.Ephemeral });
        client.activeDice.add(interaction.user.id);
        client.activeDice.add(member.id);

        let roll_1 = Math.floor(Math.random() * 100) + 1;
        let roll_2 = Math.floor(Math.random() * 100) + 1;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dice_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dice_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        let embedMessage = new EmbedBuilder()
            .setColor(0xAF873D)
            .setTitle('Dice Challenge')
            .setDescription(`You have challenged **${member.displayName}**. Total value in the bet: **${bet_value}** <:boriscoin:1490632869695983617>`);

        const { resource: diceResource } = await interaction.reply({ embeds: [embedMessage], components: [row], withResponse: true });
        const dice_message = diceResource.message;

        const filter = i => i.user.id === member.id;
        try {
            const collected = await dice_message.awaitMessageComponent({ filter, time: 60000 });
            if (collected.customId === 'dice_accept') {
                // Atomically deduct sender's bet now that opponent accepted
                const senderUpdate = await User.findOneAndUpdate(
                    { id: interaction.user.id, coins: { $gte: bet_value } },
                    { $inc: { coins: -bet_value } }
                );
                if (!senderUpdate) {
                    await collected.update({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('Challenger no longer has enough coins. Cancelled!')], components: [] });
                    client.activeDice.delete(interaction.user.id);
                    client.activeDice.delete(member.id);
                    return;
                }
                if (await User.getBalance(member.id) < bet_value) {
                    await User.findOneAndUpdate({ id: interaction.user.id }, { $inc: { coins: bet_value } });
                    await collected.update({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('You dont have enough coins to accept this challenge. Cancelled!')], components: [] });
                    client.activeDice.delete(interaction.user.id);
                    client.activeDice.delete(member.id);
                    return;
                }
                if (roll_2 > roll_1) {
                    await new Transaction(member.id, bet_value, 'Dice').process();
                    User.findOneAndUpdate({ id: member.id },             { $inc: { 'stats.dicePlayed': 1, 'stats.diceWon': 1, 'stats.coinsEarned': bet_value } }).catch(() => {});
                    User.findOneAndUpdate({ id: interaction.user.id },   { $inc: { 'stats.dicePlayed': 1, 'stats.diceLost': 1 } }).catch(() => {});
                    await collected.update({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${member.displayName}** won the dice with a roll of **${roll_2}** vs **${roll_1}**, and received **${bet_value}** <:boriscoin:1490632869695983617>`)], components: [] });
                } else {
                    await new Transaction(interaction.user.id, 2 * bet_value, 'Dice').process();
                    await new Transaction(member.id, -bet_value, 'Dice').process();
                    User.findOneAndUpdate({ id: interaction.user.id }, { $inc: { 'stats.dicePlayed': 1, 'stats.diceWon': 1, 'stats.coinsEarned': bet_value } }).catch(() => {});
                    User.findOneAndUpdate({ id: member.id },           { $inc: { 'stats.dicePlayed': 1, 'stats.diceLost': 1 } }).catch(() => {});
                    await collected.update({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${interaction.user.username}** won the dice with a roll of **${roll_1}** vs **${roll_2}**, and received **${bet_value}** <:boriscoin:1490632869695983617>`)], components: [] });
                }
            } else {
                await collected.update({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription(`**${member.displayName}** declined the dice, better friends next time!`)], components: [] });
            }
            client.activeDice.delete(interaction.user.id);
            client.activeDice.delete(member.id);
        } catch {
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xAF873D).setTitle('Dice Challenge').setDescription('Challenge timed out, bet not deducted.')], components: [] });
            client.activeDice.delete(interaction.user.id);
            client.activeDice.delete(member.id);
        }
    }
};
