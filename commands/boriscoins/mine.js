const Transaction = require('../../struct/Transaction');
const { mining_cooldown } = require('../../config.json');
const { EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');
const Item = require('../../models/item');

module.exports = {
    name: 'Mine',
    description: 'Mine for some coins (and a chance on keys)\nBronze Key: 1/100\nGold Key: 1/1000',
    usage: 'mine',
    execute: async function (message, client, args) {

        if (client.minedRecently.has(message.author.id))
            return message.reply('you are still mining!');
        client.minedRecently.add(message.author.id);

        let perks = await User.getPerks(message.author.id);

        let speedPerk = perks.find(o => o.name === 'Speed Perk');
        let luckPerk = perks.find(o => o.name === 'Luck Perk');

        let speedValue = ((!speedPerk) ? 0 : speedPerk.quantity);
        let luckValue = ((!luckPerk) ? 0 : luckPerk.quantity);

        let mineMessage = new EmbedBuilder()
            .setColor(0xAF873D)
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle('Mining...')
            .setDescription(`The mining process has started. It will take **${(mining_cooldown) - (5 * speedValue)}** seconds.\n You will receive <:boriscoin:798017751842291732> **${luckValue}** extra.`);
        let msg = await message.channel.send({ embeds: [mineMessage] });

        setTimeout(async () => {
            client.minedRecently.delete(message.author.id);
            let value = await new Transaction(message.author.id, Math.floor(Math.random() * 5) + 1 + luckValue, "Mining").process();
            mineMessage.setTitle('Mined!')
                .setDescription(`you have mined <:boriscoin:798017751842291732> **${value}**`);

            // roll for a bonus item
            // if bonus item, add field to the message, otherwise, keep going
            // rolls need to check prestige level (luck bonus)
            let bronze_roll = Math.floor(Math.random() * 100) + 1
            let gold_roll = Math.floor(Math.random() * 1000) + 1

            if (bronze_roll === 1) {
                let item = await Item.findOne({ id: 801 });
                User.findOne({ id: message.author.id }).then(async user => {
                    await user.addItem(item.name, item.id);
                    user.save();
                });
                mineMessage.addFields({ name: 'Item Drop:', value: '<' + item.emote + '>' + 'Bronze Key', inline: true });
            }
            if (gold_roll === 1) {
                let item = await Item.findOne({ id: 802 });
                User.findOne({ id: message.author.id }).then(async user => {
                    await user.addItem(item.name, item.id);
                    user.save();
                });
                mineMessage.addFields({ name: 'Item Drop:', value: '<' + item.emote + '>' + 'Gold Key', inline: true });
            }
            return msg.edit({ embeds: [mineMessage] })
        }, (mining_cooldown * 1000) - (5000 * speedValue));
    }
};