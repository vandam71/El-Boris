module.exports = {
    name: 'Giphy',
    description: 'Finds a random gif',
    usage: 'giphy <search query>',
    execute: async function (message, client, args) {
        if (!args.length) return message.reply('you need to provide a valid search query');
        const q = encodeURIComponent(args.join(' '));
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API}&q=${q}&limit=10`);
        const response = await res.json();
        if (!response.data?.length) return message.reply('No results found.');
        const gif = response.data[Math.floor(Math.random() * response.data.length)];
        message.reply({ files: [gif.images.fixed_height.url] });
    },
};