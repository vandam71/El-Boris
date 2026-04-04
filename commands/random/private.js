const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('private')
        .setDescription('Toggle private message visibility')
        .addStringOption(opt => opt
            .setName('setting')
            .setDescription('Turn private mode on or off')
            .setRequired(true)
            .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' })),
    execute: async function (interaction, client) {
        const setting = interaction.options.getString('setting');
        await User.findOne({ id: interaction.user.id }).then(async user => {
            if (setting === 'on') {
                user.private = true;
                const embed = new EmbedBuilder()
                    .setColor(0xACA19D)
                    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                    .setTitle('You turned private messages on');
                await interaction.reply({ embeds: [embed] });
            } else {
                user.private = false;
                const embed = new EmbedBuilder()
                    .setColor(0xACA19D)
                    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                    .setTitle('You turned private messages off');
                await interaction.reply({ embeds: [embed] });
            }
            await user.save();
        });
    }
};
