const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

const COST = 50;
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '🎰'];

function generateGrid() {
    return Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}

function evaluateGrid(grid) {
    const counts = {};
    for (const s of grid) counts[s] = (counts[s] || 0) + 1;
    const max = Math.max(...Object.values(counts));
    const symbol = Object.keys(counts).find(k => counts[k] === max);
    return { max, symbol };
}

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

// Shows the current best match among only the revealed cells
function matchPreview(grid, revealed) {
    const visible = grid.filter((_, i) => revealed[i]);
    if (visible.length === 0) return null;
    const counts = {};
    for (const s of visible) counts[s] = (counts[s] || 0) + 1;
    const max = Math.max(...Object.values(counts));
    const sym = Object.keys(counts).find(k => counts[k] === max);
    return max >= 2 ? `${max}x ${sym} so far...` : null;
}

function buildRows(scratchedRows, allDone) {
    const rowBtn = (idx) => new ButtonBuilder()
        .setCustomId(`sc_row_${idx}`)
        .setLabel(`Scratch Row ${idx + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(allDone || scratchedRows[idx]);
    const revealAll = new ButtonBuilder()
        .setCustomId('sc_reveal_all')
        .setLabel('Reveal All')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(allDone);
    return new ActionRowBuilder().addComponents(rowBtn(0), rowBtn(1), rowBtn(2), revealAll);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scratchcard')
        .setDescription(`Buy and scratch a card for ${COST} coins — match symbols to win!`),
    execute: async function (interaction, client) {
        const balance = await User.getBalance(interaction.user.id);
        if (balance < COST)
            return interaction.reply({ content: `You need **${COST}** <:boriscoin:1490632869695983617> to buy a scratch card. You only have **${balance}**.`, flags: MessageFlags.Ephemeral });

        await new Transaction(interaction.user.id, -COST, 'Scratchcard').process();

        const grid = generateGrid();
        const revealed = Array(9).fill(false);
        const scratchedRows = [false, false, false];

        const embed = (finished = false) => {
            const preview = !finished ? matchPreview(grid, revealed) : null;
            const e = new EmbedBuilder()
                .setColor(0xF4D03F)
                .setTitle('🎟️ Scratch Card')
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setDescription(formatGrid(grid, revealed))
                .setFooter({ text: `Cost: ${COST} coins | Scratch each row to reveal!` });
            if (preview) e.addFields({ name: '👀 Looking good...', value: preview });
            return e;
        };

        const { resource: scResource } = await interaction.reply({
            embeds: [embed()],
            components: [buildRows(scratchedRows, false)],
            withResponse: true
        });
        const msg = scResource.message;

        const filter = i => i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'sc_reveal_all') {
                revealed.fill(true);
                scratchedRows.fill(true);
            } else {
                const rowIdx = parseInt(i.customId.split('_')[2]);
                for (let col = 0; col < 3; col++) revealed[rowIdx * 3 + col] = true;
                scratchedRows[rowIdx] = true;
            }

            const allRevealed = revealed.every(Boolean);
            await i.update({ embeds: [embed()], components: [buildRows(scratchedRows, allRevealed)] });

            if (allRevealed) collector.stop('done');
        });

        collector.on('end', async (_, reason) => {
            if (reason !== 'done') revealed.fill(true);

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

            const disabledRow = buildRows([true, true, true], true);
            await msg.edit({ embeds: [finalEmbed], components: [disabledRow] });
        });
    }
};
