const { SlashCommandBuilder } = require('discord.js');
const { User } = require('../../models/user');
const AsciiTable = require('ascii-table');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highscores')
        .setDescription('Check highscores')
        .addStringOption(opt => opt
            .setName('sort')
            .setDescription('Sort by')
            .setRequired(true)
            .addChoices(
                { name: 'Azia', value: 'azia' },
                { name: 'XP', value: 'xp' },
                { name: 'Coins', value: 'coins' }
            )),
    execute: async function (interaction, client) {
        await interaction.deferReply();
        const sort = interaction.options.getString('sort');
        let users = await User.find({}).sort([[sort, 'desc']]).limit(10);
        let table = new AsciiTable();
        let rank = 1;

        switch (sort) {
            case 'azia':
                table.setHeading('', 'Name', 'Azia');
                for (const user of users) table.addRow(rank++, user.name, user.azia);
                break;
            case 'xp':
                table.setHeading('', 'Name', 'Level', 'XP');
                for (const user of users) table.addRow(rank++, user.name, user.level, user.xp);
                break;
            case 'coins':
                table.setHeading('', 'Name', 'BorisCoins');
                for (const user of users) table.addRow(rank++, user.name, user.coins);
                break;
        }

        return interaction.editReply('```\nHighscores\n' + table.toString() + '\n```');
    },
};
