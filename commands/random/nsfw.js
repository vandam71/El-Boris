const Discord = require('discord.js');

module.exports = {
    name: 'NSFW',
    description: 'Returns an nsfw image',
    usage: 'nsfw',
    execute: async function (message, client, args) {
        if (!message.channel.nsfw) return message.channel.send('This command can only be executed in a NSFW channel!');

        let lo = new Discord.MessageEmbed()
            .setDescription('Loading...')
            .setTimestamp();

        const nsfw = ['4k', 'anal', 'ass', 'pussy', 'pgif'];
        const type = nsfw[Math.floor(Math.random() * nsfw.length)];

        const m = await message.channel.send({ embeds: [lo] });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`https://nekobot.xyz/api/image?type=${type}`, { signal: controller.signal });
            const body = await res.json();
            await m.edit({
                embeds: [new Discord.MessageEmbed()
                    .setDescription(body.message)
                    .setTimestamp()
                    .setImage(body.message)]
            });
        } catch (error) {
            await m.edit('Could not load any image');
        } finally {
            clearTimeout(timeout);
        }
    }
};