const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    MessageFlags
} = require('discord.js');

const DURATION_CHOICES = [
    { name: '1 minute', value: '60' },
    { name: '5 minutes', value: '300' },
    { name: '10 minutes', value: '600' },
    { name: '30 minutes', value: '1800' },
];

const LABELS = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮'];

function buildVoteRows(options, disabled = false) {
    const buttons = options.map((opt, i) =>
        new ButtonBuilder()
            .setCustomId(`pv_${i}`)
            .setLabel(`${LABELS[i]} ${opt}`.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    return rows;
}

function buildEmbed(creator, question, options, votes, endsAt, ended = false) {
    const totalVotes = [...votes.values()].reduce((sum, s) => sum + s.size, 0);
    const description = options.map((opt, i) => {
        const count = votes.get(i).size;
        const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        return `${LABELS[i]} **${opt}**\n\`${bar}\` ${count} vote${count !== 1 ? 's' : ''} (${pct}%)`;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor(ended ? 0xACA19D : 0x5865F2)
        .setAuthor({ name: `Poll by ${creator.username}`, iconURL: creator.avatarURL() })
        .setTitle(question)
        .setDescription(description + (ended ? '' : `\n\n⏱️ Ends <t:${endsAt}:R>`))
        .setFooter({
            text: ended
                ? `Poll ended — ${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}`
                : `${totalVotes} vote${totalVotes !== 1 ? 's' : ''} cast`
        });
}

async function launchPoll(channel, creator, { question, options, durationSec, pingContent }) {
    const votes = new Map(options.map((_, i) => [i, new Set()]));
    const endsAt = Math.floor((Date.now() + durationSec * 1000) / 1000);
    const embed = () => buildEmbed(creator, question, options, votes, endsAt);

    const msg = await channel.send({
        content: pingContent,
        embeds: [embed()],
        components: buildVoteRows(options),
    });

    const collector = msg.createMessageComponentCollector({ time: durationSec * 1000 });

    collector.on('collect', async i => {
        const idx = parseInt(i.customId.split('_')[1]);
        for (const [k, voters] of votes) if (k !== idx) voters.delete(i.user.id);

        if (votes.get(idx).has(i.user.id)) {
            votes.get(idx).delete(i.user.id);
            await i.reply({ content: 'Your vote has been removed.', flags: MessageFlags.Ephemeral });
        } else {
            votes.get(idx).add(i.user.id);
            await i.reply({ content: `You voted for **${options[idx]}**.`, flags: MessageFlags.Ephemeral });
        }
        await msg.edit({ embeds: [embed()], components: buildVoteRows(options) });
    });

    collector.on('end', async () => {
        const total = [...votes.values()].reduce((s, v) => s + v.size, 0);
        const winnerIdx = [...votes.entries()].reduce((b, c) => c[1].size > b[1].size ? c : b)[0];
        const result = total === 0
            ? 'No votes cast.'
            : `Winner: ${LABELS[winnerIdx]} **${options[winnerIdx]}**`;
        await msg.edit({
            embeds: [buildEmbed(creator, question, options, votes, endsAt, true).addFields({ name: 'Result', value: result })],
            components: [],
        });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll using a form (2–9 options, one per line)')
        .addStringOption(opt => opt.setName('duration')
            .setDescription('How long the poll runs (default: 5 minutes)').setRequired(false)
            .addChoices(...DURATION_CHOICES))
        .addStringOption(opt => opt.setName('ping')
            .setDescription('Users to ping when poll starts, e.g. @user1 @user2').setRequired(false)),

    execute: async function (interaction, client) {
        const durationSec = parseInt(interaction.options.getString('duration') ?? '300');
        const pingContent = interaction.options.getString('ping')?.trim() || undefined;

        const modal = new ModalBuilder()
            .setCustomId('poll_modal')
            .setTitle('Create a Poll')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('question')
                        .setLabel('Question')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(256)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('options')
                        .setLabel('Options — one per line (2 to 9)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder('Yes\nNo\nMaybe')
                        .setMaxLength(720)
                ),
            );

        await interaction.showModal(modal);

        let submitted;
        try {
            submitted = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'poll_modal' && i.user.id === interaction.user.id,
                time: 5 * 60 * 1000,
            });
        } catch { return; }

        const question = submitted.fields.getTextInputValue('question');
        const options = submitted.fields.getTextInputValue('options')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 9);

        if (options.length < 2)
            return submitted.reply({
                content: 'Please provide at least **2 options**, one per line.',
                flags: MessageFlags.Ephemeral,
            });

        await submitted.reply({ content: '✅ Poll started!', flags: MessageFlags.Ephemeral });
        await launchPoll(interaction.channel, interaction.user, { question, options, durationSec, pingContent });
    }
};
