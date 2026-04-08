const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { TIERS } = require('../models/block');

const TIER_COLORS = {
    stone: 0x888888,
    iron: 0xC0C0C0,
    gold: 0xFFD700,
    diamond: 0x00BFFF,
};

function buildBlockEmbed(block, ended = false, payouts = null) {
    const tier = TIERS[block.type];
    const hpPct = block.currentHp / block.maxHp;
    const filled = Math.round(hpPct * 10);
    const hpBar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const activeMiners = block.miners.filter(m => !m.leftAt);
    const spawnTs = Math.floor(new Date(block.spawnedAt).getTime() / 1000);

    const lines = [
        `HP: \`${hpBar}\` ${block.currentHp}/${block.maxHp}`,
        `Reward Pool: <:boriscoin:1490632869695983617> **${block.rewardPool}**`,
        `Miners: **${activeMiners.length}**`,
        ended
            ? `\n💥 Block destroyed! Rewards distributed to **${activeMiners.length}** miner${activeMiners.length !== 1 ? 's' : ''}.`
            : `\n⏱️ Spawned <t:${spawnTs}:R>`,
    ];

    const embed = new EmbedBuilder()
        .setColor(ended ? 0xACA19D : (TIER_COLORS[block.type] ?? 0x5865F2))
        .setTitle(ended
            ? `${tier.emoji} ${tier.label} Block Destroyed`
            : `${tier.emoji} ${tier.label} Block — Active`)
        .setDescription(lines.join('\n'));

    if (ended && payouts && payouts.length > 0) {
        const payoutLines = payouts.map(p => {
            let line = `<@${p.userId}> — <:boriscoin:1490632869695983617> **${p.share}**`;
            if (p.keyDrops && p.keyDrops.length > 0)
                line += ' | ' + p.keyDrops.map(k => `${k.emote} ${k.name}`).join(', ');
            return line;
        });
        embed.addFields({ name: '💰 Rewards', value: payoutLines.join('\n') });
    } else {
        const minerList = activeMiners.length
            ? activeMiners.map(m => `<@${m.userId}>`).join(', ')
            : 'No active miners';
        embed.addFields({ name: 'Miners', value: minerList });
    }

    return embed;
}

function buildBlockRows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mb_join')
                .setLabel('⛏️ Join Mining')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('mb_leave')
                .setLabel('🏃 Leave Mining')
                .setStyle(ButtonStyle.Danger),
        ),
    ];
}

async function syncAllMessages(block, client, ended = false, payouts = null) {
    const embed = buildBlockEmbed(block, ended, payouts);
    const components = ended ? [] : buildBlockRows();
    const dead = [];

    for (const ref of block.messages) {
        try {
            const ch = client.channels.cache.get(ref.channelId) || await client.channels.fetch(ref.channelId);
            const msg = await ch.messages.fetch(ref.messageId);
            await msg.edit({ embeds: [embed], components });
        } catch {
            dead.push(ref.messageId);
        }
    }

    if (dead.length) {
        block.messages = block.messages.filter(m => !dead.includes(m.messageId));
        await block.save();
    }
}

function spawnAnnounceEmbed(block) {
    const tier = TIERS[block.type];
    return new EmbedBuilder()
        .setColor(TIER_COLORS[block.type] ?? 0x5865F2)
        .setTitle(`${tier.emoji} A ${tier.label} Block has spawned!`)
        .setDescription(`HP: **${block.maxHp}** | Reward Pool: <:boriscoin:1490632869695983617> **${block.rewardPool}**\nUse \`/mine block\` to join!`);
}

module.exports = { buildBlockEmbed, buildBlockRows, syncAllMessages, spawnAnnounceEmbed };
