const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'Kick',
    description: 'Kick someone for the given reason',
    usage: 'kick <user tag> <\'Reason\'>',
    execute: async function (message, client, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
            return message.reply("you don't have permissions to use this!");

        let member = message.mentions.members.first();

        if (!member)
            return message.reply("please mention a valid member of this server");

        if (!member.kickable)
            return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        let reason = args.slice(1).join(' ');
        if (!reason) reason = "No reason provided";

        await member.kick(reason)
            .then(() => message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because : ${reason}`))
            .catch(e => message.reply(`I couldn't kick because of : ${e}`));
    }
};