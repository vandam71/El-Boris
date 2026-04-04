const { User } = require('../../models/user');
const Item = require('../../models/item');
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'Inventory',
    description: 'Lists all items in the user inventory',
    usage: 'inventory',
    execute: async function (message, client, args) {
        let user = await User.findById(message.author.id);
        let inventory = user.inventory;

        if (!(inventory.length > 0)) return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setTitle('Inventory')
                .setDescription('Empty')]
        });

        let messageConcat = '';
        for (const item of inventory) {
            messageConcat += await Item.getItemString(item.id, item.quantity)
        }

        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
                .setTitle('Inventory')
                .setDescription(messageConcat)]
        });
    }
}