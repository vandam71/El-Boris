const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');

const DURATION_CHOICES = [
    { name: '1 minute', value: '60' },
    { name: '5 minutes', value: '300' },
    { name: '10 minutes', value: '600' },
    { name: '30 minutes', value: '1800' },
];

const LABELS = ['🇦', '🇧', '🇨', '🇩', '🇪'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll with dynamic options')
        .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(opt => opt.setName('options').setDescription('Options separated by | e.g. Yes | No | Maybe (2–5 options)').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('How long the poll runs (default: 5 minutes)').setRequired(false)
            .addChoices(...DURATION_CHOICES))
        .addUserOption(opt => opt.setName('ping1').setDescription('Tag a user to notify').setRequired(false))
        .addUserOption(opt => opt.setName('ping2').setDescription('Tag a second user').setRequired(false))
        .addUserOption(opt => opt.setName('ping3').setDescription('Tag a third user').setRequired(false)),
    execute: async function (interaction, client) {
        const question = interaction.options.getString('question');
        const durationSec = parseInt(interaction.options.getString('duration') ?? '300');

        const rawOptions = interaction.options.getString('options')
            .split('|').map(s => s.trim()).filter(Boolean);

        if (rawOptions.length < 2 || rawOptions.length > 5)
            return interaction.reply({ content: 'Please provide between **2 and 5** options separated by `|`.', flags: MessageFlags.Ephemeral });

        const pingUsers = [
            interaction.options.getUser('ping1'),
            interaction.options.getUser('ping2'),
            interaction.options.getUser('ping3'),
        ].filter(Boolean);

        const votes = new Map(rawOptions.map((_, i) => [i, new Set()]));
        const endsAt = Math.floor((Date.now() + durationSec * 1000) / 1000);

        function buildEmbed(ended = false) {
            const totalVotes = [...votes.values()].reduce((sum, s) => sum + s.size, 0);

            const description = rawOptions.map((opt, i) => {
                const count = votes.get(i).size;
                const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
                return `${LABELS[i]} **${opt}**\n\`${bar}\` ${count} vote${count !== 1 ? 's' : ''} (${pct}%)`;
            }).join('\n\n');

            return new EmbedBuilder()
                .setColor(ended ? 0xACA19D : 0x5865F2)
                .setAuthor({ name: `Poll by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() })
                .setTitle(question)
                .setDescription(description + (ended ? '' : `\n\n⏱️ Ends <t:${endsAt}:R>`))
                .setFooter({ text: ended ? `Poll ended — ${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}` : `${totalVotes} vote${totalVotes !== 1 ? 's' : ''} cast` });
        }

        function buildRow(disabled = false) {
            return new ActionRowBuilder().addComponents(
                rawOptions.map((opt, i) =>
                    new ButtonBuilder()
                        .setCustomId(`poll_${i}`)
                        .setLabel(`${LABELS[i]} ${opt}`.slice(0, 80))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled)
                )
            );
        }

        const { resource: pollResource } = await interaction.reply({
            content: pingUsers.length > 0 ? pingUsers.map(u => `<@${u.id}>`).join(' ') : undefined,
            embeds: [buildEmbed()],
            components: [buildRow()],
            withResponse: true
        });
        const msg = pollResource.message;

        const collector = msg.createMessageComponentCollector({ time: durationSec * 1000 });

        collector.on('collect', async i => {
            const optIdx = parseInt(i.customId.split('_')[1]);

            for (const [idx, voters] of votes) {
                if (idx !== optIdx) voters.delete(i.user.id);
            }

            if (votes.get(optIdx).has(i.user.id)) {
                votes.get(optIdx).delete(i.user.id);
                await i.reply({ content: 'Your vote has been removed.', flags: MessageFlags.Ephemeral });
            } else {
                votes.get(optIdx).add(i.user.id);
                await i.reply({ content: `You voted for **${rawOptions[optIdx]}**.`, flags: MessageFlags.Ephemeral });
            }

            await msg.edit({ embeds: [buildEmbed()], components: [buildRow()] });
        });

        collector.on('end', async () => {
            const totalVotes = [...votes.values()].reduce((sum, s) => sum + s.size, 0);
            const winnerIdx = [...votes.entries()].reduce((best, curr) => curr[1].size > best[1].size ? curr : best)[0];
            const winnerLabel = totalVotes === 0 ? 'No votes cast.' : `Winner: ${LABELS[winnerIdx]} **${rawOptions[winnerIdx]}**`;

            const finalEmbed = buildEmbed(true).addFields({ name: 'Result', value: winnerLabel });
            await msg.edit({ embeds: [finalEmbed], components: [buildRow(true)] });
        });
    }
};
