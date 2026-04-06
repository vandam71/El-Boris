const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

const SYMBOLS = ['🎰', '💎', '🍒', '🍊', '🍌', '🍋'];
const SPIN = '🎡';

function roll() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function makeEmbed(author, iconURL, a, b, c, color) {
    return new EmbedBuilder()
        .setTitle('✨ Special Slot Machine')
        .setAuthor({ name: author, iconURL })
        .setDescription(`[ ${a} ]  [ ${b} ]  [ ${c} ]`)
        .setColor(color);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('specialslots')
        .setDescription('Play the special slot machine')
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
        const cooldownMs = 5 * 60 * 1000;
        const expires = client.specialSlotsRecently.get(interaction.user.id);
        if (expires && now < expires) {
            const remaining = Math.ceil((expires - now) / 1000);
            return interaction.reply({ content: `Command on cooldown. Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
        }
        client.specialSlotsRecently.set(interaction.user.id, now + cooldownMs);
        setTimeout(() => { client.specialSlotsRecently.delete(interaction.user.id); }, cooldownMs);

        const $ = roll(), $$ = roll(), $$$ = roll();
        const author = interaction.user.username;
        const iconURL = interaction.user.avatarURL();

        const { resource: slotsResource } = await interaction.reply({
            embeds: [makeEmbed(author, iconURL, SPIN, SPIN, SPIN, 0xF4D03F)],
            withResponse: true
        });
        const msg = slotsResource.message;

        const STEP = 700;
        const frames = [
            [roll(), SPIN,   SPIN  ],
            [$,      SPIN,   SPIN  ],
            [$,      roll(), SPIN  ],
            [$,      $$,     SPIN  ],
            [$,      $$,     roll()],
            [$,      $$,     $$$   ],
        ];
        frames.forEach(([r1, r2, r3], i) => {
            setTimeout(() => msg.edit({ embeds: [makeEmbed(author, iconURL, r1, r2, r3, 0xF4D03F)] }), STEP * (i + 1));
        });

        setTimeout(async () => {
            let color = 0xE74C3C;
            let fieldName = 'No Match';
            let fieldValue = `Better luck next time. You lost **${bet_value}** <:boriscoin:1490632869695983617>.`;

            if ($ === $$ && $ === $$$) {
                if ($ === '🎰') {
                    await new Transaction(interaction.user.id, bet_value * 60, 'Slots').process();
                    color = 0xFFD700; fieldName = '🎰 JACKPOT!';
                    fieldValue = `Big win! You won **${bet_value * 60}** <:boriscoin:1490632869695983617>.`;
                } else if ($ === '💎') {
                    await new Transaction(interaction.user.id, bet_value * 40, 'Slots').process();
                    color = 0x00BFFF; fieldName = '💎 Three Diamonds!';
                    fieldValue = `You won **${bet_value * 40}** <:boriscoin:1490632869695983617>.`;
                } else if ($ === '🍒') {
                    await new Transaction(interaction.user.id, bet_value * 20, 'Slots').process();
                    color = 0x2ECC71; fieldName = '🍒 Three Cherries!';
                    fieldValue = `You won **${bet_value * 20}** <:boriscoin:1490632869695983617>.`;
                } else {
                    await new Transaction(interaction.user.id, bet_value * 10, 'Slots').process();
                    color = 0x2ECC71; fieldName = '3 of a Kind!';
                    fieldValue = `You won **${bet_value * 10}** <:boriscoin:1490632869695983617>.`;
                }
            } else if (($ === $$ || $ === $$$) && $ === '🍒' || ($$ === $$$ && $$ === '🍒')) {
                await new Transaction(interaction.user.id, bet_value * 3, 'Slots').process();
                color = 0x2ECC71; fieldName = '🍒🍒 Two Cherries!';
                fieldValue = `You won **${bet_value * 3}** <:boriscoin:1490632869695983617>.`;
            } else if ($ === '🍒' || $$ === '🍒' || $$$ === '🍒') {
                color = 0xF4D03F; fieldName = '🍒 One Cherry';
                fieldValue = 'You break even.';
            } else {
                await new Transaction(interaction.user.id, -bet_value, 'Slots').process();
            }

            const finalEmbed = makeEmbed(author, iconURL, $, $$, $$$, color);
            finalEmbed.addFields({ name: fieldName, value: fieldValue });
            await msg.edit({ embeds: [finalEmbed] });
        }, STEP * 7);
    }
};
