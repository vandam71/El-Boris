const { get_profile_stats } = require('./../../struct/Scrapper');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const REGIONS = ['euw', 'na', 'kr', 'eune', 'br', 'jp', 'oce', 'tr', 'ru'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('opgg')
        .setDescription('Check OP.GG ranked stats for a summoner')
        .addStringOption(opt => opt.setName('summoner').setDescription('Summoner name or Riot ID (Name#Tag)').setRequired(true))
        .addStringOption(opt => opt
            .setName('region')
            .setDescription('Server region (default: euw)')
            .setRequired(false)
            .addChoices(...REGIONS.map(r => ({ name: r.toUpperCase(), value: r })))
        ),
    execute: async function (interaction, client) {
        const summoner = interaction.options.getString('summoner');
        const region = interaction.options.getString('region') ?? 'euw';

        const loadingEmbed = new EmbedBuilder()
            .setColor(0xfaa5a8)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle(`Retrieving OP.GG stats for ${summoner}...`);

        const { resource } = await interaction.reply({ embeds: [loadingEmbed], withResponse: true });
        const msg = resource.message;

        try {
            const stats = await get_profile_stats(summoner, region);

            if (!stats || !stats.summoner) {
                return msg.edit({ embeds: [new EmbedBuilder().setColor(0xfaa5a8).setTitle(`Summoner "${summoner}" not found on OP.GG.`)] });
            }

            const embed = new EmbedBuilder()
                .setColor(0xfaa5a8)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle(`OP.GG — ${stats.summoner}`)
                .setURL(stats.profileUrl);

            if (stats.rank) {
                const rankLine = stats.lp != null ? `${stats.rank} — ${stats.lp} LP` : stats.rank;
                const recordLine = stats.wins != null
                    ? `${stats.wins}W / ${stats.losses}L — ${stats.winRate}% WR`
                    : 'No ranked games';
                embed.addFields({ name: 'Solo/Duo', value: `${rankLine}\n${recordLine}` });
            }

            if (stats.champions?.length) {
                embed.addFields({ name: 'Most Played', value: stats.champions.join(', ') });
            }

            return msg.edit({ embeds: [embed] });
        } catch {
            return msg.edit({ embeds: [new EmbedBuilder().setColor(0xfaa5a8).setTitle('Failed to retrieve OP.GG stats. Try again later.')] });
        }
    }
};

