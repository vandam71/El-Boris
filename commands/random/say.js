const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'Say',
    description: 'Makes the bot say a sentence',
    usage: 'say <sentence>',
    execute: async function (message, client, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
            return message.reply("te fuder, não mandas no bot!");
        const sayMessage = args.join(' ');
        message.delete().catch(O_o => { });
        message.channel.send(sayMessage);
    }
};