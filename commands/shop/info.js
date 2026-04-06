const Item = require("../../models/item");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display full info on a shop item')
        .addStringOption(opt => opt.setName('item').setDescription('Name of the item').setRequired(true).setAutocomplete(true)),
    autocomplete: async function (interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const Item = require('../../models/item');
        const items = await Item.find({}, 'name').limit(25);
        const choices = items.map(i => i.name).filter(n => n.toLowerCase().includes(focused));
        await interaction.respond(choices.slice(0, 25).map(n => ({ name: n, value: n })));
    },
    execute: async function (interaction, client) {

        const itemString = interaction.options.getString('item');
        let item = await Item.findOne({ name: itemString });
        if (!item) return interaction.reply({ content: 'Not a valid Item.', ephemeral: true });

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xFFFE00)
                .setAuthor({ name: 'Info on: ' + item.name })
                .setDescription(` <${item.emote}>\n **Description**: ${item.description}\n **Price**: ${item.price}\n **Category**: ${item.category}`)]
        });

    }
}