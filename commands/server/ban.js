const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'Ban',
    description: 'Bans someone for the given reason',
    usage: 'ban <user tag> <\'Reason\'>',
    execute: async function (message, client, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
            return message.reply("You don't have permissions to use this!");

        let member = message.mentions.members.first();

        if (!member)
            return message.reply("Please mention a valid member of this server");

        if (!member.kickable)
            return message.reply("I cannot ban this user! Do they have a higher role? Do I have kick permissions?");

        let reason = args.slice(1).join(' ');
        if (reason.length === 0) reason = "No reason provided";

        await member.ban({ reason })
            .then(() => message.reply(`${member.user.tag} has been banned by ${message.author.tag} because : ${reason}`))
            .catch(e => message.reply(`I couldn't ban because of : ${e}`));
    }
};