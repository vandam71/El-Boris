const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { User } = require("../../models/user");
const Item = require("../../models/item");
const { base_upgrade } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Upgrade a perk to the next tier')
        .addStringOption(opt => opt.setName('item').setDescription('Name of the perk to upgrade').setRequired(true)),
    execute: async function (interaction, client) {

        let materialID = [201, 202, 203, 204, 205];

        // check if the user has an item with that name in inventory and quantity bellow max level (6)
        // check what is the quantity (tier) and calculate the value to upgrade
        // reaction message to upgrade
        // check the tier of upgrade items needed for it and if it has them in inventory
        // calculate success percentage on upgrade
        // on success update the user with the new item quantity and remove crafting component
        // on fail, keep quantity but remove the crafting component

        let upgradeMessage = new EmbedBuilder()
            .setColor(0x8802A4)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Upgrade');

        const perkName = interaction.options.getString('item');
        let perks = await User.getPerks(interaction.user.id);
        let upgradablePerk = perks.find(o => o.name === perkName);

        if (!upgradablePerk) {
            upgradeMessage.setDescription(`You don't have this perk!`);
            return interaction.reply({ embeds: [upgradeMessage], ephemeral: true });
        }

        if (upgradablePerk.quantity >= 6) {
            upgradeMessage.setDescription(`This perk is already max level!`);
            return interaction.reply({ embeds: [upgradeMessage], ephemeral: true });
        }

        let material = await User.checkInventory(interaction.user.id, materialID[(upgradablePerk.quantity - 1)]);
        let reqMaterial = await Item.findById(materialID[(upgradablePerk.quantity - 1)]);

        if (!material) {
            upgradeMessage.setDescription("You don't have the required material to upgrade this Perk\n You need 1 <" + reqMaterial.emote + "> **" + reqMaterial.name + "**.");
            return interaction.reply({ embeds: [upgradeMessage], ephemeral: true });
        }

        let successRate = base_upgrade - (upgradablePerk.quantity * 5);

        let perk = await Item.findById(upgradablePerk.id);

        upgradeMessage.setDescription("You are attempting to upgrade <" + perk.emote + "> **" + perk.name + "** to **Tier " + (upgradablePerk.quantity + 1) + "**.\n It will consume **1** <" + reqMaterial.emote + "> **" + material.name + "** and it has a **" + successRate + "%** success rate.\n Continue?");

        const filter = (reaction, user) => ['✔', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;

        const upgrade_message = await interaction.reply({ embeds: [upgradeMessage], fetchReply: true });
        await upgrade_message.react('✔');
        await upgrade_message.react('❌');

        upgrade_message.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] })
            .then(async collected => {
                const reaction = collected.first();
                if (reaction.emoji.name === '✔') {
                    const user = await User.findOne({ id: interaction.user.id });
                    let upgradeRoll = Math.floor(Math.random() * 100);

                    // delete or reduce the quantity of the material by one
                    await user.removeItem(material.name);

                    if (upgradeRoll <= successRate) {
                        // if the roll is lower than the rate, the upgrade is successful
                        await user.addItem(upgradablePerk.name, upgradablePerk.id);
                        upgradeMessage.setDescription("You successfully upgraded <" + perk.emote + "> **" + perk.name + "** to **Tier " + (upgradablePerk.quantity + 1).toString() + "**.");
                        await upgrade_message.edit({ embeds: [upgradeMessage] });
                    } else {
                        upgradeMessage.setDescription("You failed to upgrade <" + perk.emote + "> **" + perk.name + "** to **Tier " + (upgradablePerk.quantity + 1).toString() + "**.\n Better luck next time!");
                        await upgrade_message.edit({ embeds: [upgradeMessage] });
                    }
                    await user.save();
                } else {
                    upgradeMessage.setDescription(`You declined the upgrade.`);
                    await upgrade_message.edit({ embeds: [upgradeMessage] });
                }
                return upgrade_message.reactions.removeAll();
            })
            .catch(async err => {
                upgradeMessage.setDescription(`Upgrade time has expired.`);
                await upgrade_message.edit({ embeds: [upgradeMessage] });
                return upgrade_message.reactions.removeAll();
            });
    }
}