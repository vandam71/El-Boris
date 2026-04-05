const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin with 50% chance of winning')
        .addStringOption(opt => opt
            .setName('side')
            .setDescription('Pick a side')
            .setRequired(true)
            .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
        .addStringOption(opt => opt
            .setName('bet')
            .setDescription('Amount to bet or "allin"')
            .setRequired(true)),
    execute: async function (interaction, client) {
        const side = interaction.options.getString('side');
        const betInput = interaction.options.getString('bet');

        let bet_value;
        if (betInput === 'allin') {
            bet_value = await User.getBalance(interaction.user.id);
            if (bet_value === 0)
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription("Can't all in 0.")], ephemeral: true });
        } else if (!betInput || isNaN(betInput) || parseInt(betInput) < 1) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('The value you inserted is invalid!')], ephemeral: true });
        } else if (await User.getBalance(interaction.user.id) < parseInt(betInput)) {
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins!')], ephemeral: true });
        } else {
            bet_value = parseInt(betInput);
        }

        const now = Date.now();
        const cooldownMs = 5 * 1000;
        const expires = client.flipRecently.get(interaction.user.id);
        if (expires && now < expires) {
            const remaining = Math.ceil((expires - now) / 1000);
            return interaction.reply({ content: `Command on cooldown. Try again in **${remaining}s**.`, ephemeral: true });
        }
        client.flipRecently.set(interaction.user.id, now + cooldownMs);
        setTimeout(() => { client.flipRecently.delete(interaction.user.id); }, cooldownMs);

        let flipMessage = new EmbedBuilder()
            .setColor(0xD8BFD8)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Coin Flip 🪙');

        let coin = ((Math.round(Math.random()) === 0) ? 'heads' : 'tails');

        if (coin === side) {
            await new Transaction(interaction.user.id, bet_value, 'Coinflip').process();
            flipMessage.setDescription(`You flip a coin, and it lands on ${coin.charAt(0).toUpperCase() + coin.slice(1)}. You won ${bet_value} <:boriscoin:798017751842291732>.`);
        } else {
            await new Transaction(interaction.user.id, -bet_value, 'Coinflip').process();
            flipMessage.setDescription(`You flip a coin, and it lands on ${coin.charAt(0).toUpperCase() + coin.slice(1)}. You lost ${bet_value} <:boriscoin:798017751842291732>.`);
        }
        return interaction.reply({ embeds: [flipMessage] });
    }
};
