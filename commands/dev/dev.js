const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
            .addIntegerOption(opt => opt.setName('level').setDescription('Level to set').setRequired(true))),
    execute: async function (interaction, client) {
        if (interaction.user.id !== config.dev_id)
            return interaction.reply({ content: 'You are not a developer.', ephemeral: true });

        const sub = interaction.options.getSubcommand();

        if (sub === 'mode') {
            const state = interaction.options.getString('state');
            client.devMode = state === 'on';
            return interaction.reply({ content: `Dev mode **${state}**.`, ephemeral: true });
        }

        if (sub === 'emojis') {
            const guild = client.guilds.cache.get(config.server_id);
            const emojis = {};
            guild.emojis.cache.forEach(e => { emojis[e.name] = e.id; });
            const json = JSON.stringify(emojis, null, 2);
            return interaction.reply({ content: `\`\`\`json\n${json}\n\`\`\``, ephemeral: true });
        }

        if (sub === 'give') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const user = await User.findOneAndUpdate({ id: target.id }, { $inc: { coins: amount } }, { new: true });
            if (!user) return interaction.reply({ content: 'User not found in DB.', ephemeral: true });
            return interaction.reply({ content: `Gave **${amount}** coins to **${target.username}**. New balance: **${user.coins}**.`, ephemeral: true });
        }

        if (sub === 'setlevel') {
            const target = interaction.options.getUser('user');
            const level = interaction.options.getInteger('level');
            const user = await User.findOneAndUpdate({ id: target.id }, { level }, { new: true });
            if (!user) return interaction.reply({ content: 'User not found in DB.', ephemeral: true });
            return interaction.reply({ content: `Set **${target.username}** to level **${level}**.`, ephemeral: true });
        }
    }
};
