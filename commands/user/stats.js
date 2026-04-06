const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { User } = require('../../models/user');

function winRate(played, won) {
    if (!played) return 'N/A';
    return `${Math.round((won / played) * 100)}%`;
}

function fmt(n) { return (n ?? 0).toLocaleString(); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View gameplay statistics')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('User to inspect (defaults to you)')
            .setRequired(false)),
    execute: async function (interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const isSelf = target.id === interaction.user.id;

        const user = await User.findOne({ id: target.id });
        if (!user) return interaction.reply({ content: 'That user has no profile yet.', flags: MessageFlags.Ephemeral });

        if (!isSelf && user.private)
            return interaction.reply({ content: 'This user has set their profile to private.', flags: MessageFlags.Ephemeral });

        const s = user.stats ?? {};

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 Stats — ${target.username}`)
            .setThumbnail(target.avatarURL())
            .addFields(
                {
                    name: '🎰 Casino',
                    value: [
                        `**Slots** — ${fmt(s.slotsPlayed)} played | ${fmt(s.slotsWon)}W / ${fmt(s.slotsLost)}L | ${winRate(s.slotsPlayed, s.slotsWon)} WR`,
                        `**Special Slots** — ${fmt(s.specialSlotsPlayed)} played | ${fmt(s.specialSlotsWon)}W / ${fmt(s.specialSlotsLost)}L | ${winRate(s.specialSlotsPlayed, s.specialSlotsWon)} WR`,
                        `**Blackjack** — ${fmt(s.blackjackPlayed)} played | ${fmt(s.blackjackWon)}W / ${fmt(s.blackjackPush)}P / ${fmt(s.blackjackLost)}L | ${winRate(s.blackjackPlayed, s.blackjackWon)} WR`,
                        `**Coinflip** — ${fmt(s.coinflipsPlayed)} played | ${fmt(s.coinflipsWon)}W / ${fmt(s.coinflipsLost)}L | ${winRate(s.coinflipsPlayed, s.coinflipsWon)} WR`,
                        `**Dice** — ${fmt(s.dicePlayed)} played | ${fmt(s.diceWon)}W / ${fmt(s.diceLost)}L | ${winRate(s.dicePlayed, s.diceWon)} WR`,
                        `**Scratchcard** — ${fmt(s.scratchcardsPlayed)} played | ${fmt(s.scratchcardsWon)}W / ${fmt(s.scratchcardsLost)}L | ${winRate(s.scratchcardsPlayed, s.scratchcardsWon)} WR`,
                    ].join('\n'),
                },
                {
                    name: '⛏️ Mining',
                    value: [
                        `**Solo mines** — ${fmt(s.minesSolo)} | Coins mined: <:boriscoin:1490632869695983617> ${fmt(s.coinsMinedSolo)}`,
                        `**Blocks participated** — ${fmt(s.blocksParticipated)} | Coins earned: <:boriscoin:1490632869695983617> ${fmt(s.coinsFromBlocks)}`,
                    ].join('\n'),
                },
                {
                    name: '📦 Other',
                    value: [
                        `**Chests** — ${fmt(s.bronzeChestsOpened)} bronze | ${fmt(s.goldChestsOpened)} gold`,
                        `**Upgrades** — ${fmt(s.upgradesAttempted)} attempted | ${fmt(s.upgradesSucceeded)} succeeded | ${fmt(s.upgradesFailed)} failed`,
                    ].join('\n'),
                },
                {
                    name: '💰 Lifetime Coins Earned',
                    value: `<:boriscoin:1490632869695983617> **${fmt(s.coinsEarned)}**`,
                    inline: true,
                }
            );

        return interaction.reply({ embeds: [embed] });
    }
};
