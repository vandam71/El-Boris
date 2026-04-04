module.exports = {
    name: 'Purge',
    description: 'Deletes a number of given messages',
    usage: 'purge <number of messages>',
    execute: async function (message, client, args) {
        const deleteCount = parseInt(args[0], 10);

        if (!deleteCount || deleteCount < 2 || deleteCount > 100)
            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

        message.channel.bulkDelete(deleteCount)
            .then(messages => message.reply(`bulk deleted ${messages.size} messages`))
            .catch(error => message.reply(`Couldn't delete messages because of: ${error.message}`))
    }
};