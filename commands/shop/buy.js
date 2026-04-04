const Item = require('../../models/item');
const { User, check_balance } = require('../../models/user');
const Transaction = require("../../struct/Transaction");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'Buy',
    description: 'Buys a specific item from the shop',
    usage: 'buy <item name>',
    execute: async function (message, client, args) {

        let buyMessage = new EmbedBuilder()
            .setColor(0xD8BFD8)
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle('Buy');

        const itemString = args.join(' ');
        let item = await Item.findOne({ name: itemString });
        if (!item) {
            buyMessage.setDescription('Not a valid Item');
            return message.channel.send({ embeds: [buyMessage] });
        }

        if (await User.getBalance(message.author.id) < item.price) {
            buyMessage.setDescription('Not enough money!');
            return message.channel.send({ embeds: [buyMessage] });
        }

        if (item.category === 'untradeable') {
            buyMessage.setDescription(`**Untradeable drop**`);
            return message.channel.send({ embeds: [buyMessage] });
        }

        // this check needs to be made before the add, because the addItem doesn't check if it's a perk
        // the addItem is made to be global, so it just adds of updates the item
        if (item.category === 'perk' && (await User.checkInventory(message.author.id, item.id))) {
            buyMessage.setDescription(`You already have this perk, try upgrading it **+upgrade ${item.name}**`);
            return message.channel.send({ embeds: [buyMessage] });
        }

        User.findOne({ id: message.author.id }).then(async user => {
            await user.addItem(item.name, item.id);
            user.save();
            await new Transaction(message.author.id, -item.price, 'Buy').process();
            buyMessage.setDescription("You bought <" + item.emote + "> " + item.name + " for <:boriscoin:798017751842291732> " + item.price + ".");
            return message.channel.send({ embeds: [buyMessage] });
        });
    }
};