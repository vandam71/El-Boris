const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    MessageFlags
} = require('discord.js');

const DURATION_CHOICES = [
    { name: '1 minute',   value: '60'   },
    { name: '5 minutes',  value: '300'  },
    { name: '10 minutes', value: '600'  },
    { name: '30 minutes', value: '1800' },
];

const LABELS = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮'];

// ── helpers ──────────────────────────────────────────────────────────────────

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
        .setFooter({ text: ended
            ? `Poll ended — ${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}`
            : `${totalVotes} vote${totalVotes !== 1 ? 's' : ''} cast` });
}

async function launchPoll(channel, creator, { question, options, durationSec, pingContent }) {
    const votes  = new Map(options.map((_, i) => [i, new Set()]));
    const endsAt = Math.floor((Date.now() + durationSec * 1000) / 1000);
    const embed  = () => buildEmbed(creator, question, options, votes, endsAt);

    const msg = await channel.send({
        content:    pingContent,
        embeds:     [embed()],
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
        const total     = [...votes.values()].reduce((s, v) => s + v.size, 0);
        const winnerIdx = [...votes.entries()].reduce((b, c) => c[1].size > b[1].size ? c : b)[0];
        const result    = total === 0
            ? 'No votes cast.'
            : `Winner: ${LABELS[winnerIdx]} **${options[winnerIdx]}**`;
        await msg.edit({
            embeds:     [buildEmbed(creator, question, options, votes, endsAt, true).addFields({ name: 'Result', value: result })],
            components: [],
        });
    });
}

// ── modal builders ───────────────────────────────────────────────────────────

function makeInitialModal() {
    return new ModalBuilder()
        .setCustomId('poll_m1')
        .setTitle('Create a Poll')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('question')
                    .setLabel('Question').setStyle(TextInputStyle.Short)
                    .setRequired(true).setMaxLength(256)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o1')
                    .setLabel('Option 1').setStyle(TextInputStyle.Short)
                    .setRequired(true).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o2')
                    .setLabel('Option 2').setStyle(TextInputStyle.Short)
                    .setRequired(true).setMaxLength(80)
            ),
        );
}

// Dynamic modal — shows however many slots remain (up to 5), first is required
function makeAddMoreModal(currentCount) {
    const slots = Math.min(5, 9 - currentCount);
    const modal = new ModalBuilder()
        .setCustomId('poll_addmore')
        .setTitle(`Add Options (${currentCount}/9 so far)`);
    for (let i = 0; i < slots; i++) {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(`ao_${i}`)
                    .setLabel(`Option ${currentCount + i + 1}${i > 0 ? ' (optional)' : ''}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(i === 0)
                    .setMaxLength(80)
            )
        );
    }
    return modal;
}

function controlRow(optionCount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('poll_more')
            .setLabel(`➕ Add options (${optionCount}/9)`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(optionCount >= 9),
        new ButtonBuilder().setCustomId('poll_start')
            .setLabel('🚀 Start Poll')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('poll_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger),
    );
}

function previewText(question, options) {
    return `**${question}**\n${options.map((o, i) => `${LABELS[i]} ${o}`).join('\n')}\n\n*${options.length}/9 options — add more or start the poll.*`;
}

// ── command ──────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll using a form (2–9 options)')
        .addStringOption(opt => opt.setName('duration')
            .setDescription('How long the poll runs (default: 5 minutes)').setRequired(false)
            .addChoices(...DURATION_CHOICES))
        .addStringOption(opt => opt.setName('ping')
            .setDescription('Users to ping when poll starts, e.g. @user1 @user2').setRequired(false)),

    execute: async function (interaction, client) {
        const durationSec = parseInt(interaction.options.getString('duration') ?? '300');
        const pingContent = interaction.options.getString('ping')?.trim() || undefined;

        // Step 1 — initial modal: question + 2 options
        await interaction.showModal(makeInitialModal());

        let m1;
        try {
            m1 = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'poll_m1' && i.user.id === interaction.user.id,
                time:   5 * 60 * 1000,
            });
        } catch { return; }

        const question = m1.fields.getTextInputValue('question');
        const options  = [
            m1.fields.getTextInputValue('o1'),
            m1.fields.getTextInputValue('o2'),
        ].filter(Boolean);

        const { resource: ctrlResource } = await m1.reply({
            content:      previewText(question, options),
            components:   [controlRow(options.length)],
            flags:        MessageFlags.Ephemeral,
            withResponse: true,
        });
        const ctrlMsg = ctrlResource.message;

        const btnCollector = ctrlMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time:   10 * 60 * 1000,
        });

        btnCollector.on('collect', async btnI => {
            if (btnI.customId === 'poll_cancel') {
                btnCollector.stop('cancelled');
                await btnI.update({ content: 'Poll cancelled.', components: [] });
                return;
            }

            if (btnI.customId === 'poll_more') {
                const slotsShown = Math.min(5, 9 - options.length);
                await btnI.showModal(makeAddMoreModal(options.length));

                let mMore;
                try {
                    mMore = await btnI.awaitModalSubmit({
                        filter: i => i.customId === 'poll_addmore' && i.user.id === interaction.user.id,
                        time:   5 * 60 * 1000,
                    });
                } catch { return; }

                for (let i = 0; i < slotsShown; i++) {
                    const val = mMore.fields.getTextInputValue(`ao_${i}`).trim();
                    if (val) options.push(val);
                }

                await mMore.update({
                    content:    previewText(question, options),
                    components: [controlRow(options.length)],
                });
                return;
            }

            if (btnI.customId === 'poll_start') {
                btnCollector.stop('done');
                await btnI.update({ content: '✅ Poll started!', components: [] });
                await launchPoll(interaction.channel, interaction.user, { question, options, durationSec, pingContent });
            }
        });

        btnCollector.on('end', async (_, reason) => {
            if (reason !== 'done' && reason !== 'cancelled')
                await m1.editReply({ content: '⏰ Poll creation timed out.', components: [] }).catch(() => {});
        });
    }
};
