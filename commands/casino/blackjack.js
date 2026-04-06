const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle ,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');
const shuffle = require('shuffle-array');

const DECK = [];
const suits = [{ name: 'Clubs', emoji: '♣' }, { name: 'Diamonds', emoji: '♦' }, { name: 'Hearts', emoji: '♥' }, { name: 'Spades', emoji: '♠' }];
const ranks = [
    { rank: 'A', value: [1, 11] },
    { rank: '2', value: 2 }, { rank: '3', value: 3 }, { rank: '4', value: 4 },
    { rank: '5', value: 5 }, { rank: '6', value: 6 }, { rank: '7', value: 7 },
    { rank: '8', value: 8 }, { rank: '9', value: 9 }, { rank: '10', value: 10 },
    { rank: 'J', value: 10 }, { rank: 'Q', value: 10 }, { rank: 'K', value: 10 },
];
for (const suit of suits) for (const r of ranks) DECK.push({ ...r, suit: suit.name, emoji: suit.emoji });

function freshDeck() { return shuffle(DECK.slice()); }

function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        if (Array.isArray(card.value)) { total += 11; aces++; }
        else total += card.value;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function formatHand(hand, hideSecond = false) {
    return hand.map((c, i) => (hideSecond && i === 1) ? '🂠' : `**${c.rank}**${c.emoji}`).join('  ');
}

function buildEmbed(playerHand, dealerHand, hideDealer, betValue, user) {
    const playerVal = handValue(playerHand);
    const dealerVal = hideDealer ? '?' : handValue(dealerHand);
    return new EmbedBuilder()
        .setColor(0x2D6A4F)
        .setTitle('♠ Blackjack')
        .setAuthor({ name: user.username, iconURL: user.avatarURL() })
        .addFields(
            { name: `Dealer ${hideDealer ? '' : `(${dealerVal})`}`, value: formatHand(dealerHand, hideDealer) },
            { name: `Your hand (${playerVal})`, value: formatHand(playerHand) }
        )
        .setFooter({ text: `Bet: ${betValue} BorisCoins` });
}

const activeBlackjack = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack against the dealer')
        .addStringOption(opt => opt.setName('bet').setDescription('Amount to bet or "allin"').setRequired(true)),
    execute: async function (interaction, client) {
        if (activeBlackjack.has(interaction.user.id))
            return interaction.reply({ content: 'You already have an active Blackjack game.', flags: MessageFlags.Ephemeral });

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

        activeBlackjack.add(interaction.user.id);

        const deck = freshDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        // Check for immediate blackjack
        if (handValue(playerHand) === 21) {
            const dealerFinal = handValue(dealerHand);
            let resultEmbed;
            if (dealerFinal === 21) {
                resultEmbed = buildEmbed(playerHand, dealerHand, false, bet_value, interaction.user)
                    .addFields({ name: 'Push — Both Blackjack!', value: 'Your bet is returned.' });
            } else {
                await new Transaction(interaction.user.id, Math.floor(bet_value * 1.5), 'Blackjack').process();
                resultEmbed = buildEmbed(playerHand, dealerHand, false, bet_value, interaction.user)
                    .addFields({ name: '🎉 Blackjack!', value: `You win **${Math.floor(bet_value * 1.5)}** <:boriscoin:1490632869695983617>!` });
            }
            activeBlackjack.delete(interaction.user.id);
            return interaction.reply({ embeds: [resultEmbed] });
        }

        const { resource: bjResource } = await interaction.reply({
            embeds: [buildEmbed(playerHand, dealerHand, true, bet_value, interaction.user)],
            components: [row],
            withResponse: true
        });
        const msg = bjResource.message;

        const filter = i => i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                const pVal = handValue(playerHand);

                if (pVal > 21) {
                    // Bust
                    await new Transaction(interaction.user.id, -bet_value, 'Blackjack').process();
                    const embed = buildEmbed(playerHand, dealerHand, false, bet_value, interaction.user)
                        .addFields({ name: '💥 Bust!', value: `You went over 21 and lost **${bet_value}** <:boriscoin:1490632869695983617>.` });
                    await i.update({ embeds: [embed], components: [disabledRow] });
                    collector.stop('bust');
                } else if (pVal === 21) {
                    // Auto-stand at 21
                    collector.stop('stand');
                    await i.update({ embeds: [buildEmbed(playerHand, dealerHand, true, bet_value, interaction.user)], components: [disabledRow] });
                } else {
                    await i.update({ embeds: [buildEmbed(playerHand, dealerHand, true, bet_value, interaction.user)], components: [row] });
                }
            } else {
                // Stand
                collector.stop('stand');
                await i.update({ embeds: [buildEmbed(playerHand, dealerHand, true, bet_value, interaction.user)], components: [disabledRow] });
            }
        });

        collector.on('end', async (_, reason) => {
            activeBlackjack.delete(interaction.user.id);
            if (reason === 'bust') return;

            // Dealer plays
            while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());

            const pVal = handValue(playerHand);
            const dVal = handValue(dealerHand);
            let resultField;

            if (dVal > 21 || pVal > dVal) {
                await new Transaction(interaction.user.id, bet_value, 'Blackjack').process();
                resultField = { name: '✅ You win!', value: `Dealer: **${dVal}** vs You: **${pVal}** — You won **${bet_value}** <:boriscoin:1490632869695983617>!` };
            } else if (pVal === dVal) {
                resultField = { name: '🤝 Push!', value: `Both have **${pVal}** — your bet is returned.` };
            } else {
                await new Transaction(interaction.user.id, -bet_value, 'Blackjack').process();
                resultField = { name: '❌ You lose!', value: `Dealer: **${dVal}** vs You: **${pVal}** — You lost **${bet_value}** <:boriscoin:1490632869695983617>.` };
            }

            if (reason === 'time') {
                resultField = { name: '⏰ Timed out — auto-stand', value: resultField.value };
            }

            const finalEmbed = buildEmbed(playerHand, dealerHand, false, bet_value, interaction.user)
                .addFields(resultField);
            await msg.edit({ embeds: [finalEmbed], components: [disabledRow] });
        });
    }
};
