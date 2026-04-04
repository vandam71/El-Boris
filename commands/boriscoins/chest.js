const { User } = require('../../models/user');
const { EmbedBuilder } = require("discord.js");
const Transaction = require("../../struct/Transaction");

module.exports = {
    name: 'Chest',
    description: 'If you have a specific Key, you can open a chest\n**Bronze Key** -> 300 to 400 coins\n**Gold Key** -> 2000 to 3000 coins',
    usage: 'chest <key (bronze/gold)>',
    execute: async function (message, client, args) {
        if (client.chestRecently.has(message.author.id))
            return message.reply('You have a cooldown of 5 seconds on opening chests.');
        client.chestRecently.add(message.author.id);
        setTimeout(async () => {
            client.chestRecently.delete(message.author.id);
        }, 5 * 1000);

        let key = args.join(' ');
        let chestMessage = new EmbedBuilder()
            .setColor(0xFE961A)
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle('Opening Chest');
        switch (key) {
            case 'Bronze Key':
                User.findOne({ id: message.author.id }).then(async user => {
                    let keyObj = await user.findItem(key);
                    if (!keyObj) {
                        chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                        return message.channel.send({ embeds: [chestMessage] });
                    }

                    // Receive 300 to 400 coins and 200 to 300xp (to be added latter)
                    let coins_roll = Math.floor(Math.random() * 100) + 300;
                    let xp_roll = Math.floor(Math.random() * 100) + 200;

                    await new Transaction(message.author.id, coins_roll, 'Chest').process();
                    user.removeItem(keyObj.name);
                    user.addExperience(xp_roll);
                    user.save();

                    chestMessage.setTitle('Bronze Chest').setDescription("You received <:boriscoin:798017751842291732> " + coins_roll + " and <:xp:801554148994056202> " + xp_roll + " from the chest.");
                    return message.channel.send({ embeds: [chestMessage] });
                });
                break;
            case 'Gold Key':
                User.findOne({ id: message.author.id }).then(async user => {
                    let keyObj = await user.findItem(key);
                    if (!keyObj) {
                        chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                        return message.channel.send({ embeds: [chestMessage] });
                    }

                    // Receive 2-3k coins and 500 to 1000 xp (to be added latter)
                    let coins_roll = Math.floor(Math.random() * 1000) + 2000;
                    let xp_roll = Math.floor(Math.random() * 500) + 500;

                    await new Transaction(message.author.id, coins_roll, 'Chest').process();
                    user.removeItem(keyObj.name);
                    user.addExperience(xp_roll);
                    user.save();

                    chestMessage.setTitle('Gold Chest').setDescription("You received <:boriscoin:798017751842291732> " + coins_roll + " and <:xp:801554148994056202> " + xp_roll + " from the chest.");
                    return message.channel.send({ embeds: [chestMessage] });
                });
                break;
            default:
                if (!key) {
                    chestMessage.setTitle('Failed!').setDescription("A key is required to open the chest!");
                } else {
                    chestMessage.setTitle('Failed!').setDescription("This doesn't match any of the existing keys!");
                }

                return message.channel.send({ embeds: [chestMessage] });
        }
    }
}