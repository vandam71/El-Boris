const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');

const DURATION_CHOICES = [
    { name: '1 minute', value: '60' },
    { name: '5 minutes', value: '300' },
    { name: '10 minutes', value: '600' },
    { name: '30 minutes', value: '1800' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll with up to 4 options')
        .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(opt => opt.setName('option1').setDescription('First option').setRequired(true))
        .addStringOption(opt => opt.setName('option2').setDescription('Second option').setRequired(true))
        .addStringOption(opt => opt.setName('option3').setDescription('Third option').setRequired(false))
        .addStringOption(opt => opt.setName('option4').setDescription('Fourth option').setRequired(false))
        .addStringOption(opt => opt.setName('duration').setDescription('How long the poll runs (default: 5 minutes)').setRequired(false)
            .addChoices(...DURATION_CHOICES)),
    execute: async function (interaction, client) {
        const question = interaction.options.getString('question');
        const durationSec = parseInt(interaction.options.getString('duration') ?? '300');

        const rawOptions = [
            interaction.options.getString('option1'),
            interaction.options.getString('option2'),
            interaction.options.getString('option3'),
            interaction.options.getString('option4'),
        ].filter(Boolean);

        const LABELS = ['🇦', '🇧', '🇨', '🇩'];

        // votes: Map<optionIndex, Set<userId>>
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

            const embed = new EmbedBuilder()
                .setColor(ended ? 0xACA19D : 0x5865F2)
                .setAuthor({ name: `Poll by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() })
                .setTitle(question)
                .setDescription(description)
                .setFooter({ text: ended ? `Poll ended — ${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}` : `Ends <t:${endsAt}:R> — ${totalVotes} vote${totalVotes !== 1 ? 's' : ''}` });

            return embed;
        }

        function buildRow(disabled = false) {
            return new ActionRowBuilder().addComponents(
                rawOptions.map((opt, i) =>
                    new ButtonBuilder()
                        .setCustomId(`poll_${i}`)
                        .setLabel(`${LABELS[i]} ${opt}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled)
                )
            );
        }

        const { resource: pollResource } = await interaction.reply({
            embeds: [buildEmbed()],
            components: [buildRow()],
            withResponse: true
        });
        const msg = pollResource.message;

        const collector = msg.createMessageComponentCollector({ time: durationSec * 1000 });

        collector.on('collect', async i => {
            const optIdx = parseInt(i.customId.split('_')[1]);

            // Remove user from any previous vote
            for (const [idx, voters] of votes) {
                if (idx !== optIdx) voters.delete(i.user.id);
            }

            if (votes.get(optIdx).has(i.user.id)) {
                // Toggle off if clicking same option again
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
