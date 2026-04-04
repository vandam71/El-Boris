const { User } = require("../../models/user");
const Item = require("../../models/item");

module.exports = {
    name: 'Test Module',
    description: 'Currently working...',
    usage: '',
    execute: async function (message, client, args) {


        if (message.author.id !== '90535285909118976') return;

        let member_tag = message.mentions.members.first();

        // console.log(member_tag.voice.deaf);

        await member_tag.voice.disconnect();
    }
};