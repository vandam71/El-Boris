const Transaction = require('../../struct/Transaction');
const { mining_cooldown } = require('../../config.json');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');
const Item = require('../../models/item');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Mine for BorisCoins'),
    execute: async function (interaction, client) {
        if (client.minedRecently.has(interaction.user.id))
            return interaction.reply({ content: 'you are still mining!', ephemeral: true });
        client.minedRecently.add(interaction.user.id);

        let perks = await User.getPerks(interaction.user.id);
        let speedPerk = perks.find(o => o.name === 'Speed Perk');
        let luckPerk = perks.find(o => o.name === 'Luck Perk');
        let speedValue = ((!speedPerk) ? 0 : speedPerk.quantity);
        let luckValue = ((!luckPerk) ? 0 : luckPerk.quantity);

        let mineMessage = new EmbedBuilder()
            .setColor(0xAF873D)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('Mining...')
            .setDescription(`The mining process has started. It will take **${Math.max(5, mining_cooldown - (5 * speedValue))}** seconds.\n You will receive <:boriscoin:798017751842291732> **${luckValue}** extra.`);

        await interaction.reply({ embeds: [mineMessage] });

        setTimeout(async () => {
            try {
                client.minedRecently.delete(interaction.user.id);
                let value = await new Transaction(interaction.user.id, Math.floor(Math.random() * 5) + 1 + luckValue, 'Mining').process();
                mineMessage.setTitle('Mined!')
                    .setDescription(`you have mined <:boriscoin:798017751842291732> **${value}**`);

                let bronze_roll = Math.floor(Math.random() * 100) + 1;
                let gold_roll = Math.floor(Math.random() * 1000) + 1;

                if (bronze_roll === 1) {
                    let item = await Item.findOne({ id: 801 });
                    const user = await User.findOne({ id: interaction.user.id });
                    await user.addItem(item.name, item.id);
                    await user.save();
                    mineMessage.addFields({ name: 'Item Drop:', value: '<' + item.emote + '>' + 'Bronze Key', inline: true });
                }
                if (gold_roll === 1) {
                    let item = await Item.findOne({ id: 802 });
                    const user = await User.findOne({ id: interaction.user.id });
                    await user.addItem(item.name, item.id);
                    await user.save();
                    mineMessage.addFields({ name: 'Item Drop:', value: '<' + item.emote + '>' + 'Gold Key', inline: true });
                }
                await interaction.editReply({ embeds: [mineMessage] });
            } catch (err) {
                client.minedRecently.delete(interaction.user.id);
                logger.error(`mine setTimeout error for ${interaction.user.id}: ${err}`);
            }
        }, Math.max(5, mining_cooldown - (5 * speedValue)) * 1000);
    }
};
