const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags
} = require('discord.js');
const Team = require('../../models/team');
const { User } = require('../../models/user');
const Transaction = require('../../struct/Transaction');

const TAG_REGEX = /^[A-Z]{3,5}$/;
const CREATE_COST = 2000;
const MAX_MEMBERS = 10;
const INVITE_TTL_MS = 5 * 60 * 1000;

function teamEmbed(team, members) {
    const totalLevel = members.reduce((s, u) => s + (u?.level ?? 0), 0);
    const totalCoins = members.reduce((s, u) => s + (u?.coins ?? 0), 0);
    const memberList = members
        .map(u => `<@${u.id}>${u.id === team.ownerId ? ' 👑' : ''} (lvl ${u.level})`)
        .join('\n') || 'No members';

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`[${team.tag}] ${team.name}`)
        .addFields(
            { name: 'Owner', value: `<@${team.ownerId}>`, inline: true },
            { name: 'Members', value: `${team.members.length}/${MAX_MEMBERS}`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(new Date(team.createdAt).getTime() / 1000)}:D>`, inline: true },
            { name: 'Roster', value: memberList },
            { name: 'Total Level', value: `**${totalLevel}**`, inline: true },
            { name: 'Total Networth', value: `<:boriscoin:1490632869695983617> **${totalCoins}**`, inline: true },
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team')
        .setDescription('Team commands')
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription(`Create a team for ${CREATE_COST} BorisCoins`)
            .addStringOption(o => o.setName('name').setDescription('Team name').setRequired(true).setMaxLength(32))
            .addStringOption(o => o.setName('tag').setDescription('3–5 uppercase letters, e.g. BORIS').setRequired(true).setMaxLength(5)))
        .addSubcommand(sub => sub
            .setName('invite')
            .setDescription('Invite a user to your team')
            .addUserOption(o => o.setName('user').setDescription('User to invite').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('kick')
            .setDescription('Kick a member from your team')
            .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('leave')
            .setDescription('Leave your team (owner: disbands the team)'))
        .addSubcommand(sub => sub
            .setName('disband')
            .setDescription('Disband your team permanently (owner only)'))
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('View a team\'s stats')
            .addStringOption(o => o.setName('tag').setDescription('Team tag (defaults to your own team)').setRequired(false))),

    execute: async function (interaction, client) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // ── CREATE ──────────────────────────────────────────────────────────
        if (sub === 'create') {
            const name = interaction.options.getString('name').trim();
            const tag = interaction.options.getString('tag').trim().toUpperCase();

            if (!TAG_REGEX.test(tag))
                return interaction.reply({ content: 'Tag must be **3–5 uppercase letters only** (A–Z, no numbers).', flags: MessageFlags.Ephemeral });

            const existing = await Team.findByMember(userId);
            if (existing)
                return interaction.reply({ content: `You are already in **[${existing.tag}] ${existing.name}**. Leave it first.`, flags: MessageFlags.Ephemeral });

            if (await Team.findOne({ name }))
                return interaction.reply({ content: `A team named **${name}** already exists.`, flags: MessageFlags.Ephemeral });

            if (await Team.findByTag(tag))
                return interaction.reply({ content: `The tag **[${tag}]** is already taken.`, flags: MessageFlags.Ephemeral });

            // Atomic deduction — fails if insufficient funds
            const updated = await User.findOneAndUpdate(
                { id: userId, coins: { $gte: CREATE_COST } },
                { $inc: { coins: -CREATE_COST } },
                { new: true }
            );
            if (!updated)
                return interaction.reply({ content: `You need **${CREATE_COST}** <:boriscoin:1490632869695983617> to create a team.`, flags: MessageFlags.Ephemeral });

            const team = await Team.create({
                name, tag, ownerId: userId,
                members: [{ userId, joinedAt: new Date() }],
            });

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(`✅ Team [${tag}] ${name} created!`)
                    .setDescription(`You spent <:boriscoin:1490632869695983617> **${CREATE_COST}**.`)],
            });
        }

        // ── INVITE ───────────────────────────────────────────────────────────
        if (sub === 'invite') {
            const target = interaction.options.getUser('user');
            if (target.bot) return interaction.reply({ content: "You can't invite a bot.", flags: MessageFlags.Ephemeral });
            if (target.id === userId) return interaction.reply({ content: "You can't invite yourself.", flags: MessageFlags.Ephemeral });

            const team = await Team.findOne({ ownerId: userId });
            if (!team)
                return interaction.reply({ content: "You don't own a team.", flags: MessageFlags.Ephemeral });

            if (team.members.length >= MAX_MEMBERS)
                return interaction.reply({ content: `Your team is full (${MAX_MEMBERS}/${MAX_MEMBERS}).`, flags: MessageFlags.Ephemeral });

            if (team.members.find(m => m.userId === target.id))
                return interaction.reply({ content: `<@${target.id}> is already in your team.`, flags: MessageFlags.Ephemeral });

            if (team.pendingInvites.find(i => i.userId === target.id))
                return interaction.reply({ content: `<@${target.id}> already has a pending invite.`, flags: MessageFlags.Ephemeral });

            if (await Team.findByMember(target.id))
                return interaction.reply({ content: `<@${target.id}> is already in another team.`, flags: MessageFlags.Ephemeral });

            team.pendingInvites.push({ userId: target.id, invitedAt: new Date() });
            await team.save();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`team_accept:${team._id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`team_decline:${team._id}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
            );

            const { resource } = await interaction.reply({
                content: `<@${target.id}>, you've been invited to join **[${team.tag}] ${team.name}**!`,
                components: [row],
                withResponse: true,
            });

            // Auto-expire invite after TTL
            setTimeout(async () => {
                try {
                    const t = await Team.findById(team._id);
                    if (!t) return;
                    const idx = t.pendingInvites.findIndex(i => i.userId === target.id);
                    if (idx === -1) return; // already accepted/declined
                    t.pendingInvites.splice(idx, 1);
                    t.markModified('pendingInvites');
                    await t.save();
                    await resource.message.edit({
                        content: `~~<@${target.id}>, you've been invited to join **[${t.tag}] ${t.name}**!~~\n*Invite expired.*`,
                        components: [],
                    });
                } catch { /* message may already be deleted */ }
            }, INVITE_TTL_MS);

            return;
        }

        // ── KICK ─────────────────────────────────────────────────────────────
        if (sub === 'kick') {
            const target = interaction.options.getUser('user');
            const team = await Team.findOne({ ownerId: userId });
            if (!team)
                return interaction.reply({ content: "You don't own a team.", flags: MessageFlags.Ephemeral });
            if (target.id === userId)
                return interaction.reply({ content: "You can't kick yourself. Use `/team disband` to delete the team.", flags: MessageFlags.Ephemeral });

            const idx = team.members.findIndex(m => m.userId === target.id);
            if (idx === -1)
                return interaction.reply({ content: `<@${target.id}> is not in your team.`, flags: MessageFlags.Ephemeral });

            team.members.splice(idx, 1);
            team.markModified('members');
            await team.save();
            return interaction.reply({ content: `<@${target.id}> has been kicked from **[${team.tag}] ${team.name}**.` });
        }

        // ── LEAVE ────────────────────────────────────────────────────────────
        if (sub === 'leave') {
            const team = await Team.findByMember(userId);
            if (!team)
                return interaction.reply({ content: "You are not in a team.", flags: MessageFlags.Ephemeral });

            if (team.ownerId === userId) {
                await Team.findByIdAndDelete(team._id);
                return interaction.reply({ content: `You left and **[${team.tag}] ${team.name}** has been disbanded.` });
            }

            const idx = team.members.findIndex(m => m.userId === userId);
            team.members.splice(idx, 1);
            team.markModified('members');
            await team.save();
            return interaction.reply({ content: `You left **[${team.tag}] ${team.name}**.` });
        }

        // ── DISBAND ──────────────────────────────────────────────────────────
        if (sub === 'disband') {
            const team = await Team.findOne({ ownerId: userId });
            if (!team)
                return interaction.reply({ content: "You don't own a team.", flags: MessageFlags.Ephemeral });

            await Team.findByIdAndDelete(team._id);
            return interaction.reply({ content: `**[${team.tag}] ${team.name}** has been disbanded.` });
        }

        // ── INFO ─────────────────────────────────────────────────────────────
        if (sub === 'info') {
            const tagInput = interaction.options.getString('tag');
            let team;

            if (tagInput) {
                team = await Team.findByTag(tagInput);
                if (!team)
                    return interaction.reply({ content: `No team found with tag **[${tagInput.toUpperCase()}]**.`, flags: MessageFlags.Ephemeral });
            } else {
                team = await Team.findByMember(userId);
                if (!team)
                    return interaction.reply({ content: "You are not in a team. Provide a tag to look up another team.", flags: MessageFlags.Ephemeral });
            }

            const memberDocs = await Promise.all(
                team.members.map(m => User.findOne({ id: m.userId }))
            );

            return interaction.reply({ embeds: [teamEmbed(team, memberDocs.filter(Boolean))] });
        }
    }
};
