const fs = require('fs');

module.exports = {
    name: 'Upgrade',
    description: 'Upgrades a perk to the next tier',
    usage: 'upgrade {item name}',
    execute: async function (message, client, args) {
        const buffer = fs.readFileSync('README.md');
        const fileContent = buffer.toString();

        const splitString = '**Latest Version:'
        let latestVersion = fileContent.slice(fileContent.indexOf(splitString));
        message.channel.send(latestVersion);
    }
}