const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give BorisCoins to someone')
        .addUserOption(opt => opt.setName('user').setDescription('The user to give coins to').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to give').setRequired(true).setMinValue(1)),
    execute: async function (interaction, client) {
        const member = interaction.options.getMember('user');
        const give_value = interaction.options.getInteger('amount');

        if (!member || member.id === interaction.user.id || !(await User.exists({ id: member.id })))
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Not a valid user')], ephemeral: true });

        if (await User.getBalance(interaction.user.id) < give_value)
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('You dont have enough coins to give')], ephemeral: true });

        await new Transaction(interaction.user.id, -give_value, 'Give').process();
        await new Transaction(member.id, give_value, 'Give').process();

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xAF873D)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Give')
                .setDescription(`You gave ${member.displayName} ${give_value} <:boriscoin:798017751842291732>`)]
        });
    }
};