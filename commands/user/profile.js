const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Item = require('../../models/item');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your user profile'),
    execute: async function (interaction, client) {
        let user = await User.findOne({ id: interaction.user.id });
        let embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`${interaction.user.username}'s Profile`)
            .addFields(
                { name: 'Stats', value: `**Level: ${user.level}**\n<:xp:801554148994056202> Experience: **${user.xp}**\n<:boriscoin:798017751842291732> BorisCoins: **${user.coins}**\nAzia: **${user.azia}**` },
                { name: 'Inventory', value: user.inventory.length + ' items' }
            )
            .setThumbnail(interaction.user.avatarURL());
        return interaction.reply({ embeds: [embed] });
    }
};
