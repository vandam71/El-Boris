module.exports = {
    name: 'Cat',
    description: 'Random Cat Picture',
    usage: 'cat',
    execute: async function (message, client, args) {
        const res = await fetch('https://aws.random.cat/meow');
        const json = await res.json();
        message.channel.send(json.file);
    }
};