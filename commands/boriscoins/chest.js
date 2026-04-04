const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Transaction = require('../../struct/Transaction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chest')
        .setDescription('Open a chest with a key')
        .addStringOption(opt => opt
            .setName('key')
            .setDescription('Which key to use')
            .setRequired(true)
            .addChoices(
                { name: 'Bronze Key', value: 'Bronze Key' },
                { name: 'Gold Key', value: 'Gold Key' }
            )),
    execute: async function (interaction, client) {
        if (client.chestRecently.has(interaction.user.id))
            return interaction.reply({ content: 'You have a cooldown of 5 seconds on opening chests.', ephemeral: true });
        client.chestRecently.add(interaction.user.id);
        setTimeout(async () => { client.chestRecently.delete(interaction.user.id); }, 5 * 1000);

        const key = interaction.options.getString('key');
        let chestMessage = new EmbedBuilder()
            .setColor(0xFE961A)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Opening Chest');

        const user = await User.findOne({ id: interaction.user.id });

        switch (key) {
            case 'Bronze Key': {
                let keyObj = await user.findItem(key);
                if (!keyObj) {
                    chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                    return interaction.reply({ embeds: [chestMessage] });
                }
                let coins_roll = Math.floor(Math.random() * 100) + 300;
                let xp_roll = Math.floor(Math.random() * 100) + 200;
                await new Transaction(interaction.user.id, coins_roll, 'Chest').process();
                user.removeItem(keyObj.name);
                user.addExperience(xp_roll);
                user.save();
                chestMessage.setTitle('Bronze Chest').setDescription('You received <:boriscoin:798017751842291732> ' + coins_roll + ' and <:xp:801554148994056202> ' + xp_roll + ' from the chest.');
                return interaction.reply({ embeds: [chestMessage] });
            }
            case 'Gold Key': {
                let keyObj = await user.findItem(key);
                if (!keyObj) {
                    chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                    return interaction.reply({ embeds: [chestMessage] });
                }
                let coins_roll = Math.floor(Math.random() * 1000) + 2000;
                let xp_roll = Math.floor(Math.random() * 500) + 500;
                await new Transaction(interaction.user.id, coins_roll, 'Chest').process();
                user.removeItem(keyObj.name);
                user.addExperience(xp_roll);
                user.save();
                chestMessage.setTitle('Gold Chest').setDescription('You received <:boriscoin:798017751842291732> ' + coins_roll + ' and <:xp:801554148994056202> ' + xp_roll + ' from the chest.');
                return interaction.reply({ embeds: [chestMessage] });
            }
            default:
                chestMessage.setTitle('Failed!').setDescription("This doesn't match any of the existing keys!");
                return interaction.reply({ embeds: [chestMessage] });
        }
    }
};