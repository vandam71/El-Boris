const { get_profile_stats } = require('./../../struct/Scrapper');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('opgg')
        .setDescription('Check OP.GG ranked stats for a summoner')
        .addStringOption(opt => opt.setName('summoner').setDescription('Summoner name').setRequired(true)),
    execute: async function (interaction, client) {
        const summoner = interaction.options.getString('summoner');

        let Discord_message = new EmbedBuilder()
            .setColor(0xfaa5a8)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle(`Retrieving OP.GG Stats for ${summoner}`);

        const sent_message = await interaction.reply({ embeds: [Discord_message], fetchReply: true });

        get_profile_stats(summoner).then((stats) => {
            if (stats.summoner === null) return sent_message.edit({
                embeds: [Discord_message.setTitle('This user does not exist in OP.GG.')]
            });

            Discord_message.setTitle(`OP.GG for ${stats.summoner}`);

            if (stats.ranked_solo !== null) {
                Discord_message.addFields({ name: `Solo Rank: ${stats.ranked_solo} - ${stats.solo_lp} LP`, value: `${stats.solo_wins}W/${stats.solo_losses}L - ${stats.solo_win_rate}%WR` });
            }
            if (stats.ranked_flex !== null) {
                Discord_message.addFields({ name: `Flex Rank: ${stats.ranked_flex} - ${stats.flex_lp} LP`, value: `${stats.flex_wins}W/${stats.flex_losses}L - ${stats.flex_win_rate}%WR` });
            }
            Discord_message.addFields({ name: 'Most Played Champions', value: stats.most_played_champions.join(' ') });

            sent_message.edit({ embeds: [Discord_message] });
        }).catch(() => {
            sent_message.edit({ embeds: [Discord_message.setTitle('Failed to retrieve OP.GG stats. Try again later.')] });
        });
    }
};
