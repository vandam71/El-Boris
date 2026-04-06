const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle ,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

const COST = 50;
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '🎰'];

// Returns a grid of 3x3 symbols (9 cells)
function generateGrid() {
    return Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}

// Count occurrences of the most-repeated symbol in the grid
function evaluateGrid(grid) {
    const counts = {};
    for (const s of grid) counts[s] = (counts[s] || 0) + 1;
    const max = Math.max(...Object.values(counts));
    const symbol = Object.keys(counts).find(k => counts[k] === max);
    return { max, symbol };
}

// Payout multiplier on the bet (net gain)
function payout(max, symbol) {
    if (symbol === '🎰') {
        if (max >= 6) return 20;
        if (max >= 4) return 8;
        if (max >= 3) return 3;
    }
    if (symbol === '💎') {
        if (max >= 6) return 15;
        if (max >= 4) return 6;
        if (max >= 3) return 2;
    }
    if (max >= 6) return 10;
    if (max >= 4) return 4;
    if (max >= 3) return 1;
    return 0;
}

function formatGrid(grid, revealed) {
    return [0, 3, 6].map(row =>
        grid.slice(row, row + 3).map((s, i) => revealed[row + i] ? s : '⬛').join(' ')
    ).join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scratchcard')
        .setDescription(`Buy and scratch a card for ${COST} coins — match symbols to win!`),
    execute: async function (interaction, client) {
        const balance = await User.getBalance(interaction.user.id);
        if (balance < COST)
            return interaction.reply({ content: `You need **${COST}** <:boriscoin:1490632869695983617> to buy a scratch card. You only have **${balance}**.`, flags: MessageFlags.Ephemeral });

        // Deduct cost upfront
        await new Transaction(interaction.user.id, -COST, 'Scratchcard').process();

        const grid = generateGrid();
        const revealed = Array(9).fill(false);

        const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sc_reveal').setLabel('Scratch!').setStyle(ButtonStyle.Primary).setDisabled(disabled),
            new ButtonBuilder().setCustomId('sc_reveal_all').setLabel('Reveal All').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
        );

        const embed = () => new EmbedBuilder()
            .setColor(0xF4D03F)
            .setTitle('🎟️ Scratch Card')
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setDescription(formatGrid(grid, revealed))
            .setFooter({ text: `Cost: ${COST} coins | Scratch to reveal!` });

        const msg = await interaction.reply({ embeds: [embed()], components: [buildRow()], fetchReply: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'sc_reveal') {
                // Reveal 3 random hidden cells at a time
                const hidden = revealed.map((r, idx) => r ? null : idx).filter(v => v !== null);
                const toReveal = hidden.sort(() => Math.random() - 0.5).slice(0, 3);
                for (const idx of toReveal) revealed[idx] = true;
            } else {
                // Reveal all
                revealed.fill(true);
            }

            const allRevealed = revealed.every(Boolean);
            await i.update({ embeds: [embed()], components: [buildRow(allRevealed)] });

            if (allRevealed) collector.stop('done');
        });

        collector.on('end', async (_, reason) => {
            if (reason !== 'done') {
                // Timed out — reveal everything
                revealed.fill(true);
            }

            const { max, symbol } = evaluateGrid(grid);
            const multiplier = payout(max, symbol);
            const winAmount = COST * multiplier;

            let resultText;
            if (winAmount > 0) {
                await new Transaction(interaction.user.id, winAmount, 'Scratchcard').process();
                resultText = `**${max}x ${symbol}** — You won **${winAmount}** <:boriscoin:1490632869695983617>!`;
            } else {
                resultText = `No match — better luck next time!`;
            }

            const finalEmbed = new EmbedBuilder()
                .setColor(winAmount > 0 ? 0x2ECC71 : 0xE74C3C)
                .setTitle('🎟️ Scratch Card — Result')
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setDescription(formatGrid(grid, Array(9).fill(true)))
                .addFields({ name: 'Result', value: resultText })
                .setFooter({ text: `Cost: ${COST} coins` });

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sc_reveal').setLabel('Scratch!').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('sc_reveal_all').setLabel('Reveal All').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            await msg.edit({ embeds: [finalEmbed], components: [disabledRow] });
        });
    }
};
