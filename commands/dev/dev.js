const { SlashCommandBuilder, EmbedBuilder,
    MessageFlags
} = require('discord.js');
const { User } = require('../../models/user');
const Item = require('../../models/item');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dev')
        .setDescription('Developer tools')
        .addSubcommand(sub => sub
            .setName('mode')
            .setDescription('Toggle dev mode (locks bot to developer only)')
            .addStringOption(opt => opt.setName('state').setDescription('on or off').setRequired(true)
                .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })))
        .addSubcommand(sub => sub
            .setName('emojis')
            .setDescription('List all server emojis as JSON'))
        .addSubcommand(sub => sub
            .setName('give')
            .setDescription('Give a user coins')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of coins').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('setlevel')
            .setDescription('Set a user level')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('level').setDescription('Level to set').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('additem')
            .setDescription('Add a new item to the shop')
            .addIntegerOption(opt => opt.setName('id').setDescription('Unique item ID').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Item description').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Item price in coins').setRequired(true))
            .addStringOption(opt => opt.setName('emote').setDescription('Emote string, e.g. :gem_1:123456789').setRequired(true))
            .addStringOption(opt => opt.setName('category').setDescription('Category, e.g. perk, gear, crafting, untradeable').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('removeitem')
            .setDescription('Remove an item from the shop by ID')
            .addIntegerOption(opt => opt.setName('id').setDescription('Item ID to remove').setRequired(true))),
    execute: async function (interaction, client) {
        if (interaction.user.id !== config.dev_id)
            return interaction.reply({ content: 'You are not a developer.', flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand(false);
        if (!sub) return interaction.reply({ content: 'Please specify a subcommand.', flags: MessageFlags.Ephemeral });

        if (sub === 'mode') {
            const state = interaction.options.getString('state');
            client.devMode = state === 'on';
            return interaction.reply({ content: `Dev mode **${state}**.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'emojis') {
            const guild = client.guilds.cache.get(config.server_id);
            const emojis = {};
            guild.emojis.cache.forEach(e => { emojis[e.name] = e.id; });
            const json = JSON.stringify(emojis, null, 2);
            return interaction.reply({ content: `\`\`\`json\n${json}\n\`\`\``, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'give') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const user = await User.findOneAndUpdate({ id: target.id }, { $inc: { coins: amount } }, { new: true });
            if (!user) return interaction.reply({ content: 'User not found in DB.', flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: `Gave **${amount}** coins to **${target.username}**. New balance: **${user.coins}**.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'setlevel') {
            const target = interaction.options.getUser('user');
            const level = interaction.options.getInteger('level');
            const user = await User.findOneAndUpdate({ id: target.id }, { level }, { new: true });
            if (!user) return interaction.reply({ content: 'User not found in DB.', flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: `Set **${target.username}** to level **${level}**.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'additem') {
            const id = interaction.options.getInteger('id');
            const existing = await Item.findOne({ id });
            if (existing) return interaction.reply({ content: `Item with ID \`${id}\` already exists: **${existing.name}**.`, flags: MessageFlags.Ephemeral });
            const item = await Item.create({
                id,
                name: interaction.options.getString('name'),
                description: interaction.options.getString('description'),
                price: interaction.options.getInteger('price'),
                emote: interaction.options.getString('emote'),
                category: interaction.options.getString('category'),
            });
            return interaction.reply({ content: `Created item **${item.name}** (ID: \`${item.id}\`, category: \`${item.category}\`, price: **${item.price}**).`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'removeitem') {
            const id = interaction.options.getInteger('id');
            const item = await Item.findOneAndDelete({ id });
            if (!item) return interaction.reply({ content: `No item with ID \`${id}\` found.`, flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: `Deleted item **${item.name}** (ID: \`${id}\`).`, flags: MessageFlags.Ephemeral });
        }
    }
};
