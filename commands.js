const fs = require('fs');
const { Collection } = require('discord.js');
const logger = require('./logger');

const commands = {};
const defaultCommands = fs.readdirSync('./commands')
for (const outer of defaultCommands) {
    if (outer.endsWith('.js')) {
        const command = outer.split('.').slice(0, -1).join('.');
        commands[command] = require(`./commands/${outer}`);
    } else {
        const groupCommands = fs.readdirSync(`./commands/${outer}`);
        for (const inner of groupCommands) {
            commands[inner.split('.').slice(0, -1).join('.')] = require(`./commands/${outer}/${inner}`);
        }
    }
}
const slashCommands = new Collection();
for (const cmd of Object.values(commands)) {
    if (cmd.data) slashCommands.set(cmd.data.name, cmd);
}
logger.info(`Loaded ${Object.keys(commands).length} commands (${slashCommands.size} slash)`);


async function commandHandler(message, client, prefix) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g); //splits message content by space

    // TODO fix the space after the prefix working, don't know why, but it does

    console.log(message.content, args);

    const command = args.shift().toLowerCase();                                   //finds the first value (group or default)

    if (Object.keys(commands).includes(command)) {
        try {
            await commands[command].execute(message, client, args, commands);
        } catch (e) {
            logger.error(e.message);
            message.reply(e.message);
        }
    } //else message.reply(`"${command}" is not a valid command!`);
}

module.exports = { commandHandler, commands, slashCommands };