const Item = require('../../models/item');
const { SlashCommandBuilder, EmbedBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse the shop')
        .addStringOption(opt => opt.setName('category').setDescription('Specific shop category to browse').setRequired(false)),
    execute: async function (interaction, client) {

        let itemCategories = await Item.find({ category: { $nin: ['untradeable', 'fish'] } });
        const categories = [...new Set(itemCategories.map(item => item.category))];
        const categoryArg = interaction.options.getString('category');

        if (!categoryArg) {
            let categoryMessage = '';

            categories.forEach(category => {
                let capCategory = category.charAt(0).toUpperCase() + category.slice(1);
                categoryMessage += capCategory + ' Shop — use **/shop category:** `' + category + '`\n';
            });

            let embedMessage = new EmbedBuilder()
                .setColor(0xD8BFD8)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Shop')
                .setDescription(categoryMessage);

            return interaction.reply({ embeds: [embedMessage] });
        }

        if (!categories.includes(categoryArg))
            return interaction.reply({ content: `Unknown category \`${categoryArg}\`. Use /shop to see available categories.`, flags: MessageFlags.Ephemeral });

        let items = await Item.find({ category: categoryArg });

        let capCategory = categoryArg.charAt(0).toUpperCase() + categoryArg.slice(1);

        let embedMessage = new EmbedBuilder()
            .setColor(0xD8BFD8)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle(capCategory + ' Shop');

        let messageConcat = '';

        for (const item of items) {
            messageConcat += (item.emote).toString() + ' **' + (item.name).toString() + '** - <:boriscoin:1490632869695983617>' + (item.price).toString() + ' — **/buy** `' + (item.name).toString() + '`\n';
        }

        embedMessage.setDescription(messageConcat);

        return interaction.reply({ embeds: [embedMessage] });
    }
};