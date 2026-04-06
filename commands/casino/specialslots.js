const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

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

        let items = ['🎰', '💎', '🍒', '🍊', '🍌', '🍋'];
        let $ = items[Math.floor(Math.random() * items.length)];
        let $$ = items[Math.floor(Math.random() * items.length)];
        let $$$ = items[Math.floor(Math.random() * items.length)];

        const spinner = await interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Special Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`••••••••••••••••••••••••\n•••••• ❌ ❌ ❌ ••••••\n••••••••••••••••••••••••`).setColor(0xAF873D)],
            fetchReply: true
        });

        setTimeout(() => {
            spinner.edit({ embeds: [new EmbedBuilder().setTitle('Special Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`••••••••••••••••••••••••\n•••••• ${$} ❌ ❌ ••••••\n••••••••••••••••••••••••`).setColor(0xAF873D)] });
        }, 600);
        setTimeout(() => {
            spinner.edit({ embeds: [new EmbedBuilder().setTitle('Special Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`••••••••••••••••••••••••\n•••••• ${$} ${$$} ❌ ••••••\n••••••••••••••••••••••••`).setColor(0xAF873D)] });
        }, 1200);

        setTimeout(async () => {
            let win_screen = new EmbedBuilder()
                .setTitle('Special Slot Machine')
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setDescription(`••••••••••••••••••••••••\n•••••• ${$} ${$$} ${$$$} ••••••\n••••••••••••••••••••••••`)
                .setColor(0xAF873D);

            if ($ === $$ && $ === $$$) {
                if ($ === '🎰') {
                    await new Transaction(interaction.user.id, bet_value * 60, 'Slots').process();
                    win_screen.addFields({ name: 'Jackpot!', value: 'Big win! You won ' + bet_value * 60 + ' <:boriscoin:1490632869695983617>.' });
                } else if ($ === '💎') {
                    await new Transaction(interaction.user.id, bet_value * 40, 'Slots').process();
                    win_screen.addFields({ name: '3 Diamonds', value: 'You won ' + bet_value * 40 + ' <:boriscoin:1490632869695983617>.' });
                } else if ($ === '🍒') {
                    await new Transaction(interaction.user.id, bet_value * 20, 'Slots').process();
                    win_screen.addFields({ name: '3 Cherries', value: 'You won ' + bet_value * 20 + ' <:boriscoin:1490632869695983617>.' });
                } else {
                    await new Transaction(interaction.user.id, bet_value * 10, 'Slots').process();
                    win_screen.addFields({ name: '3 Of A Kind', value: 'You won ' + bet_value * 10 + ' <:boriscoin:1490632869695983617>.' });
                }
            } else if (($ === $$ || $ === $$$) && ($ === '🍒') || (($$ === $$$) && ($$ === '🍒'))) {
                await new Transaction(interaction.user.id, bet_value * 3, 'Slots').process();
                win_screen.addFields({ name: '2 Cherries', value: 'You won ' + bet_value * 3 + ' <:boriscoin:1490632869695983617>.' });
            } else if ($ === '🍒' || $$ === '🍒' || $$$ === '🍒') {
                win_screen.addFields({ name: '1 Cherry', value: 'You break even.' });
            } else {
                await new Transaction(interaction.user.id, -bet_value, 'Slots').process();
                win_screen.addFields({ name: 'Lost...', value: 'Better luck next time.' });
            }

            await spinner.edit({ embeds: [win_screen] });
        }, 1800);
    }
};
