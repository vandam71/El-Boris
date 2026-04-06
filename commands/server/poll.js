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

// ── helpers ─────────────────────────────────────────────────────────────────

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

    const embed = () => buildEmbed(creator, question, options, votes, endsAt);

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

function makeModal1() {
    return new ModalBuilder()
        .setCustomId('poll_m1')
        .setTitle('Create a Poll — step 1 of 2')
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
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o3')
                    .setLabel('Option 3 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o4')
                    .setLabel('Option 4 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
        );
}

function makeModal2() {
    return new ModalBuilder()
        .setCustomId('poll_m2')
        .setTitle('Create a Poll — step 2 of 2')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o5')
                    .setLabel('Option 5').setStyle(TextInputStyle.Short)
                    .setRequired(true).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o6')
                    .setLabel('Option 6 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o7')
                    .setLabel('Option 7 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o8')
                    .setLabel('Option 8 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('o9')
                    .setLabel('Option 9 (optional)').setStyle(TextInputStyle.Short)
                    .setRequired(false).setMaxLength(80)
            ),
        );
}

function controlRow(addMoreDisabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('poll_more').setLabel('➕ Add more options (up to 9)').setStyle(ButtonStyle.Secondary).setDisabled(addMoreDisabled),
        new ButtonBuilder().setCustomId('poll_start').setLabel('🚀 Start Poll').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('poll_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
    );
}

function previewText(question, options) {
    return `**${question}**\n${options.map((o, i) => `${LABELS[i]} ${o}`).join('\n')}\n\n*${options.length} option${options.length !== 1 ? 's' : ''} — add more or start the poll.*`;
}

// ── command ──────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll using a form (up to 9 options)')
        .addStringOption(opt => opt.setName('duration')
            .setDescription('How long the poll runs (default: 5 minutes)').setRequired(false)
            .addChoices(...DURATION_CHOICES))
        .addStringOption(opt => opt.setName('ping')
            .setDescription('Users to ping when poll starts, e.g. @user1 @user2').setRequired(false)),

    execute: async function (interaction, client) {
        const durationSec  = parseInt(interaction.options.getString('duration') ?? '300');
        const pingContent  = interaction.options.getString('ping')?.trim() || undefined;

        // step 1 — show modal 1
        await interaction.showModal(makeModal1());

        let m1;
        try {
            m1 = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'poll_m1' && i.user.id === interaction.user.id,
                time:   5 * 60 * 1000,
            });
        } catch { return; } // user dismissed / timed out

        const question = m1.fields.getTextInputValue('question');
        const options  = ['o1','o2','o3','o4'].map(k => m1.fields.getTextInputValue(k)).filter(Boolean);

        // reply ephemeral with preview + control buttons
        const { resource: ctrlResource } = await m1.reply({
            content:    previewText(question, options),
            components: [controlRow()],
            flags:      MessageFlags.Ephemeral,
            withResponse: true,
        });
        const ctrlMsg = ctrlResource.message;

        const btnCollector = ctrlMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time:   5 * 60 * 1000,
        });

        btnCollector.on('collect', async btnI => {
            if (btnI.customId === 'poll_cancel') {
                btnCollector.stop('cancelled');
                await btnI.update({ content: 'Poll cancelled.', components: [] });
                return;
            }

            if (btnI.customId === 'poll_more') {
                // step 2 — show modal 2
                await btnI.showModal(makeModal2());

                let m2;
                try {
                    m2 = await btnI.awaitModalSubmit({
                        filter: i => i.customId === 'poll_m2' && i.user.id === interaction.user.id,
                        time:   5 * 60 * 1000,
                    });
                } catch { return; }

                const more = ['o5','o6','o7','o8','o9'].map(k => m2.fields.getTextInputValue(k)).filter(Boolean);
                options.push(...more);

                await m2.update({
                    content:    previewText(question, options),
                    components: [controlRow(true)], // disable "add more" — already at step 2
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
