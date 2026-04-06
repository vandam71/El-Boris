const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boriscoin')
        .setDescription('Learn about BorisCoin and how to earn, spend, and gamble it'),
    execute: async function (interaction, client) {
        const embed = new EmbedBuilder()
            .setColor(0xAF873D)
            .setTitle('<:boriscoin:1490632869695983617> BorisCoin')
            .setDescription('BorisCoin is the server economy currency. Earn, spend, and gamble your way to the top!')
            .addFields(
                { name: 'Earn', value: '`/mine` — Mine coins on cooldown\n`/chest` — Open daily chests\n`/dice` — Challenge others to a duel' },
                { name: 'Spend', value: '`/buy` — Buy items from the shop\n`/upgrade` — Upgrade your perks\n`/slots` — Try the slot machines' },
                { name: 'View', value: '`/profile` — See your balance\n`/highscores` — Leaderboard by coins' }
            );
        return interaction.reply({ embeds: [embed] });
    }
};
