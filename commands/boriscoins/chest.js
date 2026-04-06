const { User } = require('../../models/user');
const { SlashCommandBuilder, EmbedBuilder,
    MessageFlags
} = require('discord.js');
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
        const now = Date.now();
        const cooldownMs = 5 * 1000;
        const expires = client.chestRecently.get(interaction.user.id);
        if (expires && now < expires) {
            const remaining = Math.ceil((expires - now) / 1000);
            return interaction.reply({ content: `You have a cooldown on opening chests. Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
        }
        client.chestRecently.set(interaction.user.id, now + cooldownMs);
        setTimeout(() => { client.chestRecently.delete(interaction.user.id); }, cooldownMs);

        const key = interaction.options.getString('key');
        let chestMessage = new EmbedBuilder()
            .setColor(0xFE961A)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Opening Chest');

        const user = await User.findOne({ id: interaction.user.id });
        if (!user) return interaction.reply({ content: 'You have no profile yet! Talk in the server first.', flags: MessageFlags.Ephemeral });

        switch (key) {
            case 'Bronze Key': {
                let keyObj = await user.findItem(key);
                if (!keyObj) {
                    chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                    return interaction.reply({ embeds: [chestMessage], flags: MessageFlags.Ephemeral });
                }
                let coins_roll = Math.floor(Math.random() * 100) + 300;
                let xp_roll = Math.floor(Math.random() * 100) + 200;
                await new Transaction(interaction.user.id, coins_roll, 'Chest').process();
                await user.removeItem(keyObj.name);
                await user.addExperience(xp_roll);
                await user.save();
                User.findOneAndUpdate({ id: interaction.user.id }, { $inc: { 'stats.bronzeChestsOpened': 1, 'stats.coinsEarned': coins_roll } }).catch(() => { });
                chestMessage.setTitle('Bronze Chest').setDescription('You received <:boriscoin:1490632869695983617> ' + coins_roll + ' and <:xp:1490633441677676724> ' + xp_roll + ' from the chest.');
                return interaction.reply({ embeds: [chestMessage] });
            }
            case 'Gold Key': {
                let keyObj = await user.findItem(key);
                if (!keyObj) {
                    chestMessage.setTitle('Failed!').setDescription("You don't have this key!");
                    return interaction.reply({ embeds: [chestMessage], flags: MessageFlags.Ephemeral });
                }
                let coins_roll = Math.floor(Math.random() * 1000) + 2000;
                let xp_roll = Math.floor(Math.random() * 500) + 500;
                await new Transaction(interaction.user.id, coins_roll, 'Chest').process();
                await user.removeItem(keyObj.name);
                await user.addExperience(xp_roll);
                await user.save();
                User.findOneAndUpdate({ id: interaction.user.id }, { $inc: { 'stats.goldChestsOpened': 1, 'stats.coinsEarned': coins_roll } }).catch(() => { });
                chestMessage.setTitle('Gold Chest').setDescription('You received <:boriscoin:1490632869695983617> ' + coins_roll + ' and <:xp:1490633441677676724> ' + xp_roll + ' from the chest.');
                return interaction.reply({ embeds: [chestMessage] });
            }
            default:
                chestMessage.setTitle('Failed!').setDescription("This doesn't match any of the existing keys!");
                return interaction.reply({ embeds: [chestMessage] });
        }
    }
};