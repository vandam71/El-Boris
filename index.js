require('dotenv').config();
const { ActivityType, REST, Routes } = require('discord.js');
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

    // Register guild-scoped slash commands (instant propagation)
    const rest = new REST().setToken(process.env.DISCORD_API);
    const slashBody = [...slashCommands.values()].map(cmd => cmd.data.toJSON());
    logger.info(`Registering ${slashBody.length} slash commands for app ${client.user.id} in guild ${config.server_id}`);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.server_id),
            { body: slashBody }
        );
        logger.info(`Registered ${slashBody.length} slash commands`);
    } catch (e) {
        logger.error(`Failed to register slash commands for guild ${config.server_id}: ${e.message}`);
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
});

//When the bot is removed from a server
client.on("guildDelete", guild => {
    logger.info(`I have been removed from: ${guild.name} (id: ${guild.id})`)
});

//Command handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (client.devMode && message.author.id !== '90535285909118976') return;

    // if (message.author.id === '398231924151418880' || message.author.id === '755848086823239700') return message.reply('"fdp"');

    if (message.content === '@everyone') {
        return message.reply('@everyone ping ping @everyone');
    }

    await newMessageUser(message);

    const prefix = await Guild.getPrefix(message.guild.id);

    if (!message.content.startsWith(prefix)) return;

    await commandHandler(message, client, prefix);              //very well made command handler :)

    logger.command(`User ${message.author.username} send a command to ${message.channel.name} in ${message.guild.name}`);
});

//new member added
client.on('guildMemberAdd', async member => {
    logger.info(`New User ${member.user.username} has joined ${member.guild.name}`);
    await member.guild.channels.cache.findOne(c => c.name === "welcome").send(`${member.user.username} has joined this server`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = slashCommands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        return;
    }
    try {
        await command.execute(interaction, client);
    } catch (e) {
        logger.error(e.message);
        const err = { content: e.message, ephemeral: true };
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

client.login(process.env.DISCORD_API).then();