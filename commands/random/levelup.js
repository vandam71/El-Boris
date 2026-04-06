const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelup')
        .setDescription('Check how much XP you need to level up'),
    execute: async function (interaction, client) {
        const user = await User.findOne({ id: interaction.user.id });
        if (!user) return interaction.reply({ content: 'You have no profile yet! Talk in the server first.', flags: MessageFlags.Ephemeral });
        let req_xp = 69 * (user.level + 1) * (1 + (user.level + 1));
        let embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setColor(0xACA19D)
            .setTitle("You're almost there")
            .setDescription(`You still need ${req_xp - user.xp} xp to reach level ${user.level + 1}. Keep spamming!`);
        return interaction.reply({ embeds: [embed] });
    }
};
