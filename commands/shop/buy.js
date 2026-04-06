const Item = require('../../models/item');
const { User, check_balance } = require('../../models/user');
const Transaction = require("../../struct/Transaction");
const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addStringOption(opt => opt.setName('item').setDescription('Name of the item to buy').setRequired(true).setAutocomplete(true)),
    autocomplete: async function (interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const items = await Item.find({ category: { $ne: 'untradeable' } }, 'name').limit(25);
        const choices = items.map(i => i.name).filter(n => n.toLowerCase().includes(focused));
        await interaction.respond(choices.slice(0, 25).map(n => ({ name: n, value: n })));
    },
    execute: async function (interaction, client) {

        let buyMessage = new EmbedBuilder()
            .setColor(0xD8BFD8)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Buy');

        const itemString = interaction.options.getString('item');
        let item = await Item.findOne({ name: itemString });
        if (!item) {
            buyMessage.setDescription('Not a valid Item');
            return interaction.reply({ embeds: [buyMessage], flags: MessageFlags.Ephemeral });
        }

        if (await User.getBalance(interaction.user.id) < item.price) {
            buyMessage.setDescription('Not enough money!');
            return interaction.reply({ embeds: [buyMessage], flags: MessageFlags.Ephemeral });
        }

        if (item.category === 'untradeable') {
            buyMessage.setDescription(`**Untradeable drop**`);
            return interaction.reply({ embeds: [buyMessage], flags: MessageFlags.Ephemeral });
        }

        // this check needs to be made before the add, because the addItem doesn't check if it's a perk
        // the addItem is made to be global, so it just adds of updates the item
        if (item.category === 'perk' && (await User.checkInventory(interaction.user.id, item.id))) {
            buyMessage.setDescription(`You already have this perk, try upgrading it with **/upgrade ${item.name}**`);
            return interaction.reply({ embeds: [buyMessage], flags: MessageFlags.Ephemeral });
        }

        await new Transaction(interaction.user.id, -item.price, 'Buy').process();
        const user = await User.findOne({ id: interaction.user.id });
        await user.addItem(item.name, item.id);
        await user.save();
        buyMessage.setDescription("You bought <" + item.emote + "> " + item.name + " for <:boriscoin:798017751842291732> " + item.price + ".");
        return interaction.reply({ embeds: [buyMessage] });
    }
};