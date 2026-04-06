const { User } = require('../../models/user');
const Item = require('../../models/item');
const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Lists all items in your inventory'),
    execute: async function (interaction, client) {
        let user = await User.findById(interaction.user.id);
        if (!user) return interaction.reply({ content: "You have no profile yet! Talk in the server first.", flags: MessageFlags.Ephemeral });
        let inventory = user.inventory;

        if (!(inventory.length > 0)) return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Inventory')
                .setDescription('Empty')]
        });

        let messageConcat = '';
        for (const item of inventory) {
            messageConcat += await Item.getItemString(item.id, item.quantity);
        }

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Inventory')
                .setDescription(messageConcat)]
        });
    }
};
