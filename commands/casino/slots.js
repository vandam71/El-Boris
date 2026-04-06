const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

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

        let items = ['🎰', '🍎', '🍇', '🍋', '🍌', '🍒'];
        let $ = items[Math.floor(items.length * Math.random())];
        let $$ = items[Math.floor(items.length * Math.random())];
        let $$$ = items[Math.floor(items.length * Math.random())];

        if ($ === $$ && $ === $$$) {
            if ($ === '🎰') {
                await new Transaction(interaction.user.id, bet_value * 30, 'Slots').process();
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`• ${$}  ${$$}  ${$$$} •`).addFields({ name: 'Jackpot!', value: 'Big win! You won ' + bet_value * 30 + ' <:boriscoin:798017751842291732>.' }).setColor(0xAF873D)] });
            } else {
                await new Transaction(interaction.user.id, bet_value * 10, 'Slots').process();
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`• ${$}  ${$$}  ${$$$} •`).addFields({ name: '3 of a kind!', value: 'You won ' + bet_value * 10 + ' <:boriscoin:798017751842291732>.' }).setColor(0xAF873D)] });
            }
        } else if (($ === $$ || $ === $$$) && ($ === '🎰') || (($$ === $$$) && ($$ === '🎰'))) {
            await new Transaction(interaction.user.id, bet_value * 4, 'Slots').process();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`• ${$}  ${$$}  ${$$$} •`).addFields({ name: '2 Jokers!', value: 'You won ' + bet_value * 4 + ' <:boriscoin:798017751842291732>.' }).setColor(0xAF873D)] });
        } else if ($ === '🎰' || $$ === '🎰' || $$$ === '🎰') {
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`• ${$}  ${$$}  ${$$$} •`).addFields({ name: '1 Joker!', value: 'You break even!' }).setColor(0xAF873D)] });
        } else {
            await new Transaction(interaction.user.id, -bet_value, 'Slots').process();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Slot Machine').setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() }).setDescription(`• ${$}  ${$$}  ${$$$} •`).addFields({ name: 'Lost...', value: 'Better luck next time.' }).setColor(0xAF873D)] });
        }
    }
};
