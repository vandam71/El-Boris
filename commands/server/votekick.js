const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'Vote Kick',
    description: 'Asks for a vote to kick a member in a voice chat',
    usage: 'votekick <tag>',
    execute: async function (message, client, args) {
        // TODO replace with embed

        if (message.author.id !== '90535285909118976') return;

        let member_tag = message.mentions.members.first();
        if (!member_tag)
            return message.reply("please mention a valid member of this server");

        // Find the voice channel the user is on
        let channel = message.member.voice.channel;
        if (!channel) return console.log('user not in voice');

        let members = channel.members;

        // static, at least *two* members need to vote to kick beside the one that calls the vote
        let members_id = [];
        members.forEach(member => {
            if (!member.voice.deaf)
                members_id.push(member.id);
        });

        if (members_id.includes(member_tag.id)) {
            // the member is in the voice channel
            // create embed message and wait for reactions (from the ids that are on the channel)

            const filter = (reaction, user) => {
                return ['✔'].includes(reaction.emoji.name) && members_id.includes(user.id);
            }

            let embedMessage = new EmbedBuilder()
                .setColor(0x4F2A5D)
                .setTitle('Vote Kick')
                .setDescription(`Voting to kick **${member_tag.displayName}**.`);

            message.channel.send({ embeds: [embedMessage] }).then(async vote_kick_message => {
                await vote_kick_message.react('✔');

                vote_kick_message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                    .then(async collected => {
                        // count how many reacts are received and if it's over the threshold do stuff
                    });
            });

            // await member_tag.voice.disconnect();
        }


        // count members
        // if only two people

    },
};