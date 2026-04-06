const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

const SYMBOLS = ['🎰', '🍎', '🍇', '🍋', '🍌', '🍒'];
const SPIN = '🎡';

function roll() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function evaluate(a, b, c, bet) {
    if (a === b && b === c) {
        if (a === '🎰') return { label: '🎰 JACKPOT!', gain: bet * 30, color: 0xFFD700 };
        return { label: '3 of a Kind!', gain: bet * 10, color: 0x2ECC71 };
    }
    const jokers = [a, b, c].filter(s => s === '🎰').length;
    if (jokers === 2) return { label: '2 Jokers!', gain: bet * 4, color: 0x2ECC71 };
    if (jokers === 1) return { label: 'Break Even — 1 Joker', gain: 0, color: 0xF4D03F };
    return { label: 'No Match', gain: -bet, color: 0xE74C3C };
}

function makeEmbed(author, iconURL, a, b, c, color) {
    return new EmbedBuilder()
        .setTitle('🎰 Slot Machine')
        .setAuthor({ name: author, iconURL })
        .setDescription(`[ ${a} ]  [ ${b} ]  [ ${c} ]`)
        .setColor(color);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine')
        .addStringOption(opt => opt.setName('bet').setDescription('Amount to bet or "allin"').setRequired(true)),
    execute: async function (interaction, client) {
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

        const now = Date.now();
        const cooldownMs = 15 * 1000;
        const expires = client.slotsRecently.get(interaction.user.id);
        if (expires && now < expires) {
            const remaining = Math.ceil((expires - now) / 1000);
            return interaction.reply({ content: `Command on cooldown. Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
        }
        client.slotsRecently.set(interaction.user.id, now + cooldownMs);
        setTimeout(() => { client.slotsRecently.delete(interaction.user.id); }, cooldownMs);

        const a = roll(), b = roll(), c = roll();
        const author = interaction.user.username;
        const iconURL = interaction.user.avatarURL();

        const { resource: slotsResource } = await interaction.reply({
            embeds: [makeEmbed(author, iconURL, SPIN, SPIN, SPIN, 0xF4D03F)],
            withResponse: true
        });
        const msg = slotsResource.message;

        setTimeout(() => msg.edit({ embeds: [makeEmbed(author, iconURL, a, SPIN, SPIN, 0xF4D03F)] }), 700);
        setTimeout(() => msg.edit({ embeds: [makeEmbed(author, iconURL, a, b, SPIN, 0xF4D03F)] }), 1400);

        setTimeout(async () => {
            const { label, gain, color } = evaluate(a, b, c, bet_value);
            if (gain !== 0) await new Transaction(interaction.user.id, gain, 'Slots').process();

            // Stats tracking
            const statsInc = { 'stats.slotsPlayed': 1 };
            if (gain > 0) { statsInc['stats.slotsWon'] = 1; statsInc['stats.coinsEarned'] = gain; }
            else if (gain < 0) statsInc['stats.slotsLost'] = 1;
            User.findOneAndUpdate({ id: interaction.user.id }, { $inc: statsInc }).catch(() => {});

            const resultText = gain > 0
                ? `You won **${gain}** <:boriscoin:1490632869695983617>!`
                : gain === 0
                    ? 'You break even.'
                    : `You lost **${Math.abs(gain)}** <:boriscoin:1490632869695983617>.`;

            const finalEmbed = makeEmbed(author, iconURL, a, b, c, color);
            finalEmbed.addFields({ name: label, value: resultText });
            await msg.edit({ embeds: [finalEmbed] });
        }, 2100);
    }
};
