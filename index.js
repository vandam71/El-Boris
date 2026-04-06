require('dotenv').config();
const { ActivityType, REST, Routes,
    MessageFlags
} = require('discord.js');
const config = require('./config.json');
const ElBoris = require("./struct/Client");
const client = new ElBoris();
const { commandHandler, slashCommands } = require("./commands");
const { newMessageUser, syncGuildMembers, User } = require('./models/user');
const { Block } = require('./models/block');
const { syncAllMessages, spawnAnnounceEmbed } = require('./struct/BlockUtils');
const Transaction = require('./struct/Transaction');
const Team = require('./models/team');
const Guild = require('./models/guild');
const logger = require('./logger');

//Bot startup message
client.on('clientReady', async () => {
    logger.info(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`)
    // Sync all guilds the bot is already in (handles DB resets)
    for (const guild of client.guilds.cache.values()) {
        await Guild.syncGuild(guild);
        const created = await syncGuildMembers(guild);
        logger.info(`Synced members for ${guild.name}: ${created} new user(s) created`);
    }
    logger.info('Guild sync complete');

    // Register guild-scoped slash commands for every guild the bot is in (instant propagation)
    const rest = new REST().setToken(process.env.DISCORD_API);
    const slashBody = [...slashCommands.values()].map(cmd => cmd.data.toJSON());

    // Clear any stale global commands (they can shadow guild commands with outdated definitions)
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        logger.info('Cleared global application commands');
    } catch (e) {
        logger.error(`Failed to clear global commands: ${e.message}`);
    }

    logger.info(`Registering ${slashBody.length} slash commands across ${client.guilds.cache.size} guild(s)`);
    for (const guild of client.guilds.cache.values()) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: slashBody }
            );
            logger.info(`Registered slash commands for guild ${guild.name} (${guild.id})`);
        } catch (e) {
            logger.error(`Failed to register slash commands for guild ${guild.name} (${guild.id}): ${e.message}`);
        }
    }

    await client.user.setPresence({
        activities: [{
            name: '/help',
            type: ActivityType.Listening
        }],
        status: 'online'
    });

    // Block startup recovery — restore nextBlockSpawn from DB
    const activeBlock = await Block.getActive();
    if (activeBlock) {
        client.nextBlockSpawn = Infinity;
        logger.info(`Resumed active ${activeBlock.type} block (HP: ${activeBlock.currentHp}/${activeBlock.maxHp})`);
    } else {
        const lastBlock = await Block.findOne({ active: false }).sort({ endedAt: -1 });
        client.nextBlockSpawn = lastBlock?.endedAt
            ? lastBlock.endedAt.getTime() + config.block_spawn_cooldown * 1000
            : Date.now();
        logger.info(`Next block spawn: ${new Date(client.nextBlockSpawn).toISOString()}`);
    }

    // Block tick — recursive setTimeout so each interval reads the live blockTickInterval
    const blockTick = async () => {
        try {
            let block = await Block.getActive();

            if (!block) {
                if (Date.now() >= client.nextBlockSpawn) {
                    client.nextBlockSpawn = Infinity;
                    block = await Block.spawnRandom();
                    logger.info(`Spawned ${block.type} block (HP: ${block.maxHp}, Reward: ${block.rewardPool})`);

                    // Announce to every configured guild channel
                    const announceEmbed = spawnAnnounceEmbed(block);
                    const guildDocs = await Guild.getMiningChannels();
                    for (const doc of guildDocs) {
                        try {
                            const ch = client.channels.cache.get(doc.miningChannelId)
                                || await client.channels.fetch(doc.miningChannelId);
                            await ch.send({ embeds: [announceEmbed] });
                        } catch { /* channel gone or no perms, skip */ }
                    }
                }
                setTimeout(blockTick, client.blockTickInterval * 1000);
                return;
            }

            // Deal damage from each active miner — randomised: floor((1 + speedLevel) * (1 + rand))
            const activeMiners = block.miners.filter(m => !m.leftAt);
            let totalDamage = 0;
            for (const miner of activeMiners) {
                const perks = await User.getPerks(miner.userId);
                const speedPerk = perks.find(p => p.name === 'Speed Perk');
                const speedLevel = speedPerk ? speedPerk.quantity : 0;
                totalDamage += Math.floor((1 + speedLevel) * (1 + Math.random()));
            }

            block.currentHp = Math.max(0, block.currentHp - totalDamage);

            if (block.currentHp <= 0) {
                // Block destroyed — distribute rewards
                block.active = false;
                block.endedAt = new Date();
                await block.save();

                const payouts = [];
                for (const miner of activeMiners) {
                    const perks = await User.getPerks(miner.userId);
                    const luckPerk = perks.find(p => p.name === 'Luck Perk');
                    const luckLevel = luckPerk ? luckPerk.quantity : 0;
                    const baseShare = Math.floor(block.rewardPool / activeMiners.length);
                    const share = Math.floor(baseShare * (1 + 0.1 * luckLevel));
                    await new Transaction(miner.userId, share, 'Block Mining').process();
                    User.findOneAndUpdate({ id: miner.userId }, { $inc: { 'stats.blocksParticipated': 1, 'stats.coinsFromBlocks': share, 'stats.coinsEarned': share } }).catch(() => { });
                    payouts.push({ userId: miner.userId, share });
                }

                await syncAllMessages(block, client, true, payouts);
                // Spawn jitter: ±20% of cooldown
                client.nextBlockSpawn = Date.now() + config.block_spawn_cooldown * (0.8 + Math.random() * 0.4) * 1000;
                logger.info(`Block destroyed! Rewarded ${activeMiners.length} miner(s). Next spawn: ${new Date(client.nextBlockSpawn).toISOString()}`);
            } else {
                await block.save();
                if (totalDamage > 0) await syncAllMessages(block, client, false);
            }
        } catch (err) {
            logger.error(`Block tick error: ${err.message}`);
        }
        setTimeout(blockTick, client.blockTickInterval * 1000);
    };
    setTimeout(blockTick, client.blockTickInterval * 1000);
});

//When the bot is added to a new server
client.on('guildCreate', async guild => {
    logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`)
    await Guild.syncGuild(guild);
    const created = await syncGuildMembers(guild);
    logger.info(`Created ${created} new user(s) for guild ${guild.name}`);
    const rest = new REST().setToken(process.env.DISCORD_API);
    const slashBody = [...slashCommands.values()].map(cmd => cmd.data.toJSON());
    try {
        await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: slashBody });
        logger.info(`Registered slash commands for new guild ${guild.name} (${guild.id})`);
    } catch (e) {
        logger.error(`Failed to register slash commands for new guild ${guild.name} (${guild.id}): ${e.message}`);
    }
});

//When the bot is removed from a server
client.on("guildDelete", guild => {
    logger.info(`I have been removed from: ${guild.name} (id: ${guild.id})`)
});

//Command handler
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;

        if (client.devMode && message.author.id !== config.dev_id) return;

        // if (message.author.id === '398231924151418880' || message.author.id === '755848086823239700') return message.reply('"fdp"');

        if (message.content === '@everyone') {
            return message.reply('@everyone ping ping @everyone');
        }

        await newMessageUser(message);

        const prefix = await Guild.getPrefix(message.guild.id);

        if (!message.content.startsWith(prefix)) return;

        await commandHandler(message, client, prefix);              //very well made command handler :)

        logger.command(`User ${message.author.username} send a command to ${message.channel.name} in ${message.guild.name}`);
    } catch (e) {
        logger.error(`messageCreate error: ${e.message}`);
    }
});

//new member added
client.on('guildMemberAdd', async member => {
    if (member.user.bot) return;
    logger.info(`New User ${member.user.username} has joined ${member.guild.name}`);
    await User.findOneAndUpdate(
        { id: member.user.id },
        { name: member.user.username },
        { upsert: true, setDefaultsOnInsert: true }
    );
    const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'welcome');
    if (welcomeChannel) await welcomeChannel.send(`${member.user.username} has joined this server`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const command = slashCommands.get(interaction.commandName);
        if (command?.autocomplete) {
            try { await command.autocomplete(interaction); } catch { await interaction.respond([]).catch(() => { }); }
        }
        return;
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mb_join') {
            try {
                const block = await Block.getActive();
                if (!block) return interaction.reply({ content: 'The mining block is no longer active.', flags: MessageFlags.Ephemeral });

                const userId = interaction.user.id;
                if (block.miners.find(m => m.userId === userId && !m.leftAt))
                    return interaction.reply({ content: 'You are already mining this block!', flags: MessageFlags.Ephemeral });

                const soloExpires = client.minedRecently.get(userId);
                if (soloExpires && Date.now() < soloExpires) {
                    const remaining = Math.ceil((soloExpires - Date.now()) / 1000);
                    return interaction.reply({ content: `You just mined solo. Wait **${remaining}s** before joining a block.`, flags: MessageFlags.Ephemeral });
                }

                block.miners.push({ userId, joinedAt: new Date(), leftAt: null });
                await block.save();
                await interaction.reply({ content: '⛏️ You joined the mining block!', flags: MessageFlags.Ephemeral });
                await syncAllMessages(block, client, false);
            } catch (err) {
                logger.error(`mb_join error: ${err.message}`);
            }
            return;
        }

        if (interaction.customId === 'mb_leave') {
            try {
                const block = await Block.getActive();
                if (!block) return interaction.reply({ content: 'There is no active mining block to leave.', flags: MessageFlags.Ephemeral });

                const userId = interaction.user.id;
                const idx = block.miners.findIndex(m => m.userId === userId && !m.leftAt);
                if (idx === -1) return interaction.reply({ content: 'You are not in this mining block.', flags: MessageFlags.Ephemeral });

                block.miners[idx].leftAt = new Date();
                block.markModified('miners');
                await block.save();
                await interaction.reply({ content: '🏃 You left the mining block.', flags: MessageFlags.Ephemeral });
                await syncAllMessages(block, client, false);
            } catch (err) {
                logger.error(`mb_leave error: ${err.message}`);
            }
            return;
        }

        if (interaction.customId.startsWith('team_accept:')) {
            const teamId = interaction.customId.split(':')[1];
            const userId = interaction.user.id;
            try {
                const team = await Team.findById(teamId);
                if (!team) return interaction.reply({ content: 'This team no longer exists.', flags: MessageFlags.Ephemeral });

                const inviteIdx = team.pendingInvites.findIndex(i => i.userId === userId);
                if (inviteIdx === -1)
                    return interaction.reply({ content: 'You do not have a pending invite to this team.', flags: MessageFlags.Ephemeral });

                if (await Team.findByMember(userId))
                    return interaction.reply({ content: 'You are already in a team. Leave it first.', flags: MessageFlags.Ephemeral });

                if (team.members.length >= 10)
                    return interaction.reply({ content: 'The team is now full.', flags: MessageFlags.Ephemeral });

                team.pendingInvites.splice(inviteIdx, 1);
                team.members.push({ userId, joinedAt: new Date() });
                team.markModified('pendingInvites');
                team.markModified('members');
                await team.save();

                await interaction.update({
                    content: `<@${userId}> joined **[${team.tag}] ${team.name}**!`,
                    components: [],
                });
            } catch (err) {
                logger.error(`team_accept error: ${err.message}`);
            }
            return;
        }

        if (interaction.customId.startsWith('team_decline:')) {
            const teamId = interaction.customId.split(':')[1];
            const userId = interaction.user.id;
            try {
                const team = await Team.findById(teamId);
                if (!team) return interaction.reply({ content: 'This team no longer exists.', flags: MessageFlags.Ephemeral });

                const inviteIdx = team.pendingInvites.findIndex(i => i.userId === userId);
                if (inviteIdx === -1)
                    return interaction.reply({ content: 'You do not have a pending invite to this team.', flags: MessageFlags.Ephemeral });

                team.pendingInvites.splice(inviteIdx, 1);
                team.markModified('pendingInvites');
                await team.save();

                await interaction.update({
                    content: `<@${userId}> declined the invite to **[${team.tag}] ${team.name}**.`,
                    components: [],
                });
            } catch (err) {
                logger.error(`team_decline error: ${err.message}`);
            }
            return;
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = slashCommands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({ content: 'Unknown command.', flags: MessageFlags.Ephemeral });
        return;
    }
    try {
        await command.execute(interaction, client);

        // Grant XP for every slash command (except dev)
        if (interaction.commandName !== 'dev') {
            User.findOne({ id: interaction.user.id }).then(async user => {
                if (!user) return;
                await user.addExperience(5);
                await user.save();
            }).catch(() => { });
        }
    } catch (e) {
        logger.error(e.message);
        const err = { content: e.message, flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(err).catch(() => { });
        } else {
            await interaction.reply(err).catch(() => { });
        }
    }
});

client.on('error', e => logger.error(e));
client.on('warn', e => logger.warn(e));
client.on('debug', e => logger.debug(e));

client.login(process.env.DISCORD_API).catch(e => { logger.error(`Login failed: ${e.message}`); process.exit(1); });