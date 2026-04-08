const { User } = require('../../models/user');
const Item = require('../../models/item');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Lists all items in your inventory')
        .addStringOption(opt => opt
            .setName('filter')
            .setDescription('Filter by keyword (name or category)')
            .setRequired(false))
        .addStringOption(opt => opt
            .setName('sort')
            .setDescription('Sort order (default: category)')
            .setRequired(false)
            .addChoices(
                { name: 'Category', value: 'category' },
                { name: 'Name A\u2192Z', value: 'name_asc' },
                { name: 'Name Z\u2192A', value: 'name_desc' },
                { name: 'Quantity \u2191', value: 'qty_asc' },
                { name: 'Quantity \u2193', value: 'qty_desc' },
            )),
    execute: async function (interaction, client) {
        const user = await User.findOne({ id: interaction.user.id });
        if (!user) return interaction.reply({ content: "You have no profile yet! Talk in the server first.", flags: MessageFlags.Ephemeral });

        const filterRaw = interaction.options.getString('filter')?.toLowerCase() ?? '';
        const sort = interaction.options.getString('sort') ?? 'category';

        if (!user.inventory.length) return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Inventory')
                .setDescription('Empty')]
        });

        // Enrich each inventory item with its DB category and emote
        const enriched = await Promise.all(user.inventory.map(async item => {
            const dbItem = await Item.findOne({ id: item.id });
            return { id: item.id, name: item.name, quantity: item.quantity, category: dbItem?.category ?? 'other', emote: dbItem?.emote ?? '?' };
        }));

        // Filter by keyword against name or category
        const filtered = filterRaw
            ? enriched.filter(i => i.name.toLowerCase().includes(filterRaw) || i.category.toLowerCase().includes(filterRaw))
            : enriched;

        if (!filtered.length) return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle('Inventory')
                .setDescription(`No items match **"${filterRaw}"**.`)],
            flags: MessageFlags.Ephemeral
        });

        // Sort
        const sortFns = {
            category:  (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
            name_asc:  (a, b) => a.name.localeCompare(b.name),
            name_desc: (a, b) => b.name.localeCompare(a.name),
            qty_asc:   (a, b) => a.quantity - b.quantity,
            qty_desc:  (a, b) => b.quantity - a.quantity,
        };
        filtered.sort(sortFns[sort] ?? sortFns.category);

        // Build display -- group by category header when sort is 'category'
        let description = '';
        if (sort === 'category') {
            const groups = {};
            for (const item of filtered) {
                (groups[item.category] ??= []).push(item);
            }
            for (const [cat, items] of Object.entries(groups)) {
                description += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**\n`;
                description += items.map(i => `${i.emote} ${i.name} \xd7${i.quantity}`).join('\n') + '\n\n';
            }
        } else {
            description = filtered.map(i => `${i.emote} ${i.name} \xd7${i.quantity}`).join('\n');
        }

        const title = filterRaw ? `Inventory -- "${filterRaw}"` : 'Inventory';
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x00AE86)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
                .setTitle(title)
                .setDescription(description.trim())]
        });
    }
};
