const { EmbedBuilder } = require("discord.js");
const { User } = require("../../models/user");
const Item = require("../../models/item");
const { base_upgrade } = require('../../config.json');

module.exports = {
    name: 'Upgrade',
    description: 'Upgrades a perk to the next tier',
    usage: 'upgrade <item name>',
    execute: async function (message, client, args) {

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
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setTitle('Upgrade')

        if (args.length === 0) {
            upgradeMessage.setDescription(`You need to insert the name of the perk you wish to upgrade!`);
            return message.channel.send({ embeds: [upgradeMessage] });
        }

        const perkName = args.join(' ');
        let perks = await User.getPerks(message.author.id);
        let upgradablePerk = perks.find(o => o.name === perkName);

        if (!upgradablePerk) {
            upgradeMessage.setDescription(`You don't have this perk!`);
            return message.channel.send({ embeds: [upgradeMessage] });
        }


        if (upgradablePerk.quantity >= 6) {
            upgradeMessage.setDescription(`This perk is already max level!`);
            return message.channel.send({ embeds: [upgradeMessage] });
        }

        let material = await User.checkInventory(message.author.id, materialID[(upgradablePerk.quantity - 1)]);
        let reqMaterial = await Item.findById(materialID[(upgradablePerk.quantity - 1)]);

        if (!material) {
            upgradeMessage.setDescription("You don't have the required material to upgrade this Perk\n You need 1 <" + reqMaterial.emote + "> **" + reqMaterial.name + "**.");
            return message.channel.send({ embeds: [upgradeMessage] });
        }

        let successRate = base_upgrade - (upgradablePerk.quantity * 5);

        let perk = await Item.findById(upgradablePerk.id);

        const filter = (reaction, user) => {
            return ['✔', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        }

        upgradeMessage.setDescription("You are attempting to upgrade <" + perk.emote + "> **" + perk.name + "** to **Tier " + (upgradablePerk.quantity + 1) + "**.\n It will consume **1** <" + reqMaterial.emote + "> **" + material.name + "** and it has a **" + successRate + "%** success rate.\n Continue?");

        message.channel.send({ embeds: [upgradeMessage] })
            .then(async upgrade_message => {
                await upgrade_message.react('✔');
                await upgrade_message.react('❌');

                upgrade_message.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] })
                    .then(async collected => {
                        const reaction = collected.first();
                        if (reaction.emoji.name === '✔') {
                            // the upgrade success depends on the item quantity, it needs to be calculated previously
                            // if success, update perk quantity, remove the crafting item
                            // if not success, do nothing to perk, remove the crafting item (seems legit)
                            User.findOne({ id: message.author.id }).then(async user => {
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
                                user.save();
                            });
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
            });
    }
}