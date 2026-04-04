module.exports = {
    name: 'Poke',
    description: 'Send a private message to the user you want to poke',
    usage: 'poke <tag>',
    execute: async function (message, client, args) {
        // TODO replace with embed

        let member_tag = message.mentions.members.first();
        if (!member_tag)
            return message.reply("please mention a valid member of this server.");

        if (client.pokedRecently.has(member_tag.id))
            return message.reply('this user was poked in the last minute.');
        client.pokedRecently.add(member_tag.id);
        setTimeout(async () => {
            client.pokedRecently.delete(member_tag.id);
        }, 60 * 1000);

        const call_messages = ['is calling you!', 'needs your attention...', 'requests your presence.', 'demands you to join him!'];

        return member_tag.send('<@' + message.author.id + '> ' + call_messages[Math.floor(Math.random() * call_messages.length)]);
    },
};