require('dotenv').config();
const { ActivityType, REST, Routes,
    MessageFlags
} = require('discord.js');
const config = require('./config.json');
const ElBoris = require("./struct/Client");
const client = new ElBoris();
const { commandHandler, slashCommands } = require("./commands");
const { newMessageUser } = require('./models/user');
const Guild = require('./models/guild');
const logger = require('./logger');

//Bot startup message
client.on('clientReady', async () => {
    logger.info(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`)
    // Sync all guilds the bot is already in (handles DB resets)
    for (const guild of client.guilds.cache.values()) {
        await Guild.syncGuild(guild);
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
});

//When the bot is added to a new server
client.on('guildCreate', async guild => {
    logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`)
    await Guild.syncGuild(guild);
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
    logger.info(`New User ${member.user.username} has joined ${member.guild.name}`);
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

    if (!interaction.isChatInputCommand()) return;

    const command = slashCommands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({ content: 'Unknown command.', flags: MessageFlags.Ephemeral });
        return;
    }
    try {
        await command.execute(interaction, client);
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