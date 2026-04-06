const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');
const Item = require('../../models/item');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your user profile'),
    execute: async function (interaction, client) {
        let user = await User.findOne({ id: interaction.user.id });
        if (!user) return interaction.reply({ content: "You have no profile yet! Talk in the server first.", flags: MessageFlags.Ephemeral });
        let embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`${interaction.user.username}'s Profile`)
            .addFields(
                { name: 'Stats', value: `**Level: ${user.level}**\n<:xp:1490633441677676724> Experience: **${user.xp}**\n<:boriscoin:1490632869695983617> BorisCoins: **${user.coins}**\nAzia: **${user.azia}**` },
                { name: 'Inventory', value: `${user.inventory.length} items — use \`/inventory\` to view` }
            )
            .setThumbnail(interaction.user.avatarURL());
        return interaction.reply({ embeds: [embed] });
    }
};
