const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giphy')
        .setDescription('Find a random GIF')
        .addStringOption(opt => opt.setName('query').setDescription('Search query for the GIF').setRequired(true)),
    execute: async function (interaction, client) {
        await interaction.deferReply();
        const q = encodeURIComponent(interaction.options.getString('query'));
        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API}&q=${q}&limit=10`);
            const response = await res.json();
            if (!response.data?.length) return interaction.editReply({ content: 'No results found for that query.' });
            const gif = response.data[Math.floor(Math.random() * response.data.length)];
            return interaction.editReply({ files: [gif.images.fixed_height.url] });
        } catch {
            return interaction.editReply({ content: 'Failed to fetch a GIF. Try again later.' });
        }
    },
};
