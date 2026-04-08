const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { User } = require('../../models/user');
const Item = require('../../models/item');
const Transaction = require('../../struct/Transaction');
const { fishing_cooldown } = require('../../config.json');
const logger = require('../../logger');

// Fish item IDs — must exist in the Item collection (see /dev additem)
const FISH = [
    { id: null, name: null,           emote: '💨', tier: 'Nothing',   weight: 50, min: 0,  max: 0   },
    { id: 901, name: 'Fish',          emote: '🐟', tier: 'Common',    weight: 25, min: 2,  max: 4   },
    { id: 902, name: 'Tropical Fish', emote: '🐠', tier: 'Uncommon',  weight: 12, min: 5,  max: 9   },
    { id: 903, name: 'Pufferfish',    emote: '🐡', tier: 'Rare',      weight: 8,  min: 10, max: 18  },
    { id: 904, name: 'Shark',         emote: '🦈', tier: 'Epic',      weight: 4,  min: 25, max: 40  },
    { id: 905, name: 'Octopus',       emote: '🐙', tier: 'Legendary', weight: 1,  min: 60, max: 100 },
];

const FISH_IDS = new Set(FISH.filter(f => f.id).map(f => f.id));
const ESCAPE_CHANCE = 0.2;  // 20% chance the fish wriggles free on reel
const BITE_WINDOW_MS = 5000; // 5s to reel after bite

// Weighted random pick — Luck Perk shifts table toward higher tiers
function rollFish(luckBonus = 0) {
    // Luck reduces Nothing weight and shifts toward higher fish tiers
    const table = FISH.map((f, i) => ({
        ...f,
        weight: !f.id
            ? Math.max(1, f.weight - luckBonus * 4)          // reduce Nothing chance
            : Math.max(1, f.weight + (i - 1) * luckBonus * 2) // boost rarer fish more
    }));
    const total = table.reduce((sum, f) => sum + f.weight, 0);
    let roll = Math.floor(Math.random() * total);
    for (const f of table) {
        roll -= f.weight;
        if (roll < 0) return f;
    }
    return table[table.length - 1];
}

function rollValue(fish) {
    return Math.floor(Math.random() * (fish.max - fish.min + 1)) + fish.min;
}

function reelRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('fish_reel')
            .setLabel('🎣 Reel!')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
}

// Cast subcommand — go fishing
async function executeCast(interaction, client) {
    const userId = interaction.user.id;
    const now = Date.now();
    const expires = client.fishedRecently.get(userId);
    if (expires && now < expires) {
        const remaining = Math.ceil((expires - now) / 1000);
        return interaction.reply({ content: `Your line is still in the water! Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
    }

    const cooldownMs = fishing_cooldown * 1000;
    client.fishedRecently.set(userId, now + cooldownMs);
    setTimeout(() => client.fishedRecently.delete(userId), cooldownMs);

    const perks = await User.getPerks(userId);
    const luckPerk = perks.find(p => p.name === 'Luck Perk');
    const luckBonus = luckPerk ? luckPerk.quantity : 0;

    const castEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
        .setTitle('🎣 Casting...')
        .setDescription(`You cast your line into the water. Wait for a bite...${luckBonus > 0 ? `\n*Luck Perk is active!*` : ''}`);

    const { resource: fishResource } = await interaction.reply({
        embeds: [castEmbed],
        components: [reelRow()],
        withResponse: true
    });
    const msg = fishResource.message;

    // 2–4s jitter before something (or nothing) bites
    const biteMs = 2000 + Math.floor(Math.random() * 2000);
    let biteActive = false;
    let caughtFish = null;

    const filter = i => i.user.id === userId && i.customId === 'fish_reel';
    const collector = msg.createMessageComponentCollector({ filter, time: biteMs + BITE_WINDOW_MS, max: 1 });

    const biteTimer = setTimeout(async () => {
        caughtFish = rollFish(luckBonus);
        if (!caughtFish.id) return; // Nothing bit — biteActive stays false
        biteActive = true;
        const biteEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('🐟 Something bit! REEL IT IN!')
            .setDescription('You feel a tug on the line! Hit Reel before it escapes!');
        try { await msg.edit({ embeds: [biteEmbed], components: [reelRow()] }); } catch { /* deleted */ }
    }, biteMs);

    collector.on('collect', async i => {
        clearTimeout(biteTimer);

        if (!biteActive) {
            // Reeled before anything was on the hook
            const earlyEmbed = new EmbedBuilder()
                .setColor(0x95A5A6)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('🎣 Too early!')
                .setDescription("Nothing's on the hook yet. You spooked the fish.");
            return i.update({ embeds: [earlyEmbed], components: [reelRow(true)] });
        }

        // Fish is on the hook — roll escape
        if (Math.random() < ESCAPE_CHANCE) {
            const escapedEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('🎣 It got away!')
                .setDescription(`${caughtFish.emote} The **${caughtFish.name}** wriggled free just before you reeled it in!`);
            return i.update({ embeds: [escapedEmbed], components: [reelRow(true)] });
        }

        // Caught!
        try {
            const user = await User.findOne({ id: userId });
            if (user) {
                await user.addItem(caughtFish.name, caughtFish.id);
                await user.save();
                User.findOneAndUpdate({ id: userId }, { $inc: { 'stats.fishCaught': 1 } }).catch(() => { });
            }
        } catch (err) {
            logger.error(`fish reel DB error for ${userId}: ${err}`);
        }

        const caughtEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
            .setTitle('🎣 Caught!')
            .setDescription(`${caughtFish.emote} **${caughtFish.name}** *(${caughtFish.tier})*\n\nUse \`/fish sell\` to sell your catch.`);
        return i.update({ embeds: [caughtEmbed], components: [reelRow(true)] });
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'limit') return; // already handled in collect
        clearTimeout(biteTimer);
        const finalEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });
        if (biteActive) {
            finalEmbed
                .setColor(0xE67E22)
                .setTitle('🎣 It got away!')
                .setDescription(`${caughtFish.emote} The **${caughtFish.name}** slipped off the hook — you were too slow!`);
        } else {
            finalEmbed
                .setColor(0x95A5A6)
                .setTitle('🎣 Nothing...')
                .setDescription('The water was still. Nothing bit this time.');
        }
        try { await msg.edit({ embeds: [finalEmbed], components: [reelRow(true)] }); } catch { /* deleted */ }
    });
}

// Sell subcommand — sell all fish in inventory
async function executeSell(interaction, client) {
    const userId = interaction.user.id;
    const user = await User.findOne({ id: userId });
    if (!user) return interaction.reply({ content: 'You have no profile yet! Talk in the server first.', flags: MessageFlags.Ephemeral });

    const fishInInventory = user.inventory.filter(item => FISH_IDS.has(item.id));
    if (!fishInInventory.length)
        return interaction.reply({ content: "You don't have any fish to sell.", flags: MessageFlags.Ephemeral });

    // Roll sell value per fish × quantity, collect summary
    const lines = [];
    let totalCoins = 0;
    let totalFishCount = 0;

    for (const invItem of fishInInventory) {
        const fishDef = FISH.find(f => f.id === invItem.id);
        let subtotal = 0;
        for (let i = 0; i < invItem.quantity; i++) subtotal += rollValue(fishDef);
        totalCoins += subtotal;
        totalFishCount += invItem.quantity;
        lines.push(`${fishDef.emote} **${invItem.name}** ×${invItem.quantity} — <:boriscoin:1490632869695983617> ${subtotal}`);
        await user.removeItem(invItem.name);
    }

    await user.save();
    await new Transaction(userId, totalCoins, 'Fishing').process();
    User.findOneAndUpdate(
        { id: userId },
        { $inc: { 'stats.fishSold': totalFishCount, 'stats.coinsFromFishing': totalCoins, 'stats.coinsEarned': totalCoins } }
    ).catch(() => { });

    const embed = new EmbedBuilder()
        .setColor(0xAF873D)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
        .setTitle('🐟 Fish Sold!')
        .setDescription(lines.join('\n'))
        .addFields({ name: 'Total', value: `<:boriscoin:1490632869695983617> **${totalCoins}**`, inline: true });

    return interaction.reply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing and sell your catch for BorisCoins')
        .addSubcommand(sub => sub
            .setName('cast')
            .setDescription('Cast your line and wait for a catch'))
        .addSubcommand(sub => sub
            .setName('sell')
            .setDescription('Sell all fish in your inventory')),
    execute: async function (interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'cast') return executeCast(interaction, client);
        if (sub === 'sell') return executeSell(interaction, client);
    }
};
