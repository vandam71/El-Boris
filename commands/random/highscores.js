const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models/user');

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

        const labels = { azia: 'Azia', xp: 'XP', coins: 'BorisCoins' };
        let lines;
        switch (sort) {
            case 'azia':
                lines = users.map((u, i) => `\`${i + 1}.\` **${u.name}** — ${u.azia} Azia`);
                break;
            case 'xp':
                lines = users.map((u, i) => `\`${i + 1}.\` **${u.name}** — Lv.${u.level} (${u.xp} XP)`);
                break;
            case 'coins':
                lines = users.map((u, i) => `\`${i + 1}.\` **${u.name}** — ${u.coins} <:boriscoin:1490632869695983617>`);
                break;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Highscores — ${labels[sort]}`)
            .setColor(0xAF873D)
            .setDescription(lines.join('\n'));

        return interaction.editReply({ embeds: [embed] });
    },
};
