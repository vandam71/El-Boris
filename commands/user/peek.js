const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('peek')
        .setDescription("Look at another user's profile")
        .addUserOption(opt => opt.setName('user').setDescription('User to peek at').setRequired(true)),
    execute: async function (interaction, client) {
        const member = interaction.options.getMember('user');
        if (!member) return interaction.reply({ content: 'Please mention a valid member of this server.', ephemeral: true });
        let user = await User.findOne({ id: member.user.id });
        if (user === null) {
            return interaction.reply({ content: 'This user has no profile!', ephemeral: true });
        }
        if (user.private) {
            return interaction.reply({ content: 'This user has set their profile to private.', ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle(`${member.user.username} Profile`)
            .addFields({ name: "Stats", value: `**Level: ${user.level}**\n<:xp:801554148994056202> Experience: **${user.xp}**\n<:boriscoin:798017751842291732> BorisCoins: **${user.coins}**\nAzia: **${user.azia}**` })
            .setThumbnail(member.user.avatarURL());
        return interaction.reply({ embeds: [embed] });
    }
};