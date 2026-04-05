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
        const user = await User.findOne({ id: interaction.user.id });
        if (!user) return interaction.reply({ content: 'You have no profile yet! Talk in the server first.', ephemeral: true });

        user.private = (setting === 'on');
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(0xACA19D)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle(`You turned private messages ${setting === 'on' ? 'on' : 'off'}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
