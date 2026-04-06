const Transaction = require('../../struct/Transaction');
const { mining_cooldown } = require('../../config.json');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { User } = require('../../models/user');
const { Block } = require('../../models/block');
const { buildBlockEmbed, buildBlockRows } = require('../../struct/BlockUtils');
const Item = require('../../models/item');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Mine for BorisCoins')
        .addSubcommand(sub => sub
            .setName('solo')
            .setDescription('Mine alone for BorisCoins'))
        .addSubcommand(sub => sub
            .setName('block')
            .setDescription('View or join the active global mining block')),

    execute: async function (interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'solo') return executeSolo(interaction, client);
        if (sub === 'block') return executeBlock(interaction, client);
    }
};

async function executeSolo(interaction, client) {
    const userId = interaction.user.id;

    // Guard: can't solo mine while in an active block
    const block = await Block.getActive();
    if (block && block.miners.find(m => m.userId === userId && !m.leftAt)) {
        return interaction.reply({
            content: '⛏️ You are currently in a mining block! Leave it first before mining solo.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const now = Date.now();
    const expires = client.minedRecently.get(userId);
    if (expires && now < expires) {
        const remaining = Math.ceil((expires - now) / 1000);
        return interaction.reply({ content: `You are still mining! Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
    }

    let perks = await User.getPerks(userId);
    let speedPerk = perks.find(o => o.name === 'Speed Perk');
    let luckPerk = perks.find(o => o.name === 'Luck Perk');
    let speedValue = speedPerk ? speedPerk.quantity : 0;
    let luckValue = luckPerk ? luckPerk.quantity : 0;
    const cooldownMs = Math.max(5, mining_cooldown - (5 * speedValue)) * 1000;
    client.minedRecently.set(userId, now + cooldownMs);

    let mineMessage = new EmbedBuilder()
        .setColor(0xAF873D)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
        .setTitle('Mining...')
        .setDescription(`The mining process has started. It will take **${cooldownMs / 1000}** seconds.${luckValue > 0 ? `\nYou will receive <:boriscoin:1490632869695983617> **${luckValue}** extra.` : ''}`);

    await interaction.reply({ embeds: [mineMessage] });

    setTimeout(async () => {
        try {
            client.minedRecently.delete(userId);
            let value = await new Transaction(userId, Math.floor(Math.random() * 5) + 1 + luckValue, 'Mining').process();
            User.findOneAndUpdate({ id: userId }, { $inc: { 'stats.minesSolo': 1, 'stats.coinsMinedSolo': value, 'stats.coinsEarned': value } }).catch(() => {});
            mineMessage.setTitle('Mined!')
                .setDescription(`you have mined <:boriscoin:1490632869695983617> **${value}**`);

            let bronze_roll = Math.floor(Math.random() * 100) + 1;
            let gold_roll = Math.floor(Math.random() * 1000) + 1;

            if (bronze_roll === 1) {
                let item = await Item.findOne({ id: 801 });
                const user = await User.findOne({ id: userId });
                await user.addItem(item.name, item.id);
                await user.save();
                mineMessage.addFields({ name: 'Item Drop:', value: item.emote + ' Bronze Key', inline: true });
            }
            if (gold_roll === 1) {
                let item = await Item.findOne({ id: 802 });
                const user = await User.findOne({ id: userId });
                await user.addItem(item.name, item.id);
                await user.save();
                mineMessage.addFields({ name: 'Item Drop:', value: item.emote + ' Gold Key', inline: true });
            }
            await interaction.editReply({ embeds: [mineMessage] });
        } catch (err) {
            client.minedRecently.delete(userId);
            logger.error(`mine solo setTimeout error for ${userId}: ${err}`);
        }
    }, cooldownMs);
}

async function executeBlock(interaction, client) {
    const userId = interaction.user.id;
    const block = await Block.getActive();

    if (!block) {
        const nextSpawn = client.nextBlockSpawn === Infinity || client.nextBlockSpawn === null
            ? null
            : client.nextBlockSpawn;
        const desc = nextSpawn
            ? `No active mining block.\nNext block spawns <t:${Math.floor(nextSpawn / 1000)}:R>`
            : 'No active mining block.';
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x888888).setTitle('⛏️ Mining Block').setDescription(desc)],
            flags: MessageFlags.Ephemeral,
        });
    }

    // Already an active miner — show ephemeral with Leave button
    if (block.miners.find(m => m.userId === userId && !m.leftAt)) {
        return interaction.reply({
            content: "You're already mining this block!",
            embeds: [buildBlockEmbed(block)],
            components: buildBlockRows(),
            flags: MessageFlags.Ephemeral,
        });
    }

    // Post public message and register its ref on the block
    const { resource } = await interaction.reply({
        embeds: [buildBlockEmbed(block)],
        components: buildBlockRows(),
        withResponse: true,
    });
    const msg = resource.message;

    block.messages.push({ channelId: interaction.channelId, messageId: msg.id });
    await block.save();
}
