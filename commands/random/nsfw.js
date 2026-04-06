const { SlashCommandBuilder, EmbedBuilder ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nsfw')
        .setDescription('Returns an NSFW image (NSFW channels only)'),
    execute: async function (interaction, client) {
        if (!interaction.channel.nsfw)
            return interaction.reply({ content: 'This command can only be used in a NSFW channel!', flags: MessageFlags.Ephemeral });

        const lo = new EmbedBuilder().setDescription('Loading...').setTimestamp();
        await interaction.reply({ embeds: [lo] });

        const nsfw = ['4k', 'anal', 'ass', 'pussy', 'pgif'];
        const type = nsfw[Math.floor(Math.random() * nsfw.length)];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`https://nekobot.xyz/api/image?type=${type}`, { signal: controller.signal });
            const body = await res.json();
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription(body.message).setTimestamp().setImage(body.message)]
            });
        } catch (error) {
            await interaction.editReply('Could not load any image');
        } finally {
            clearTimeout(timeout);
        }
    }
};
