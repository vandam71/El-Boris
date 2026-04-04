const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('votekick')
        .setDescription('Start a vote to kick a member from a voice channel')
        .addUserOption(opt => opt.setName('user').setDescription('User to vote-kick').setRequired(true)),
    execute: async function (interaction, client) {
        if (interaction.user.id !== '90535285909118976') return interaction.reply({ content: 'Not available yet.', ephemeral: true });

        const member_tag = interaction.options.getMember('user');
        if (!member_tag)
            return interaction.reply({ content: 'Please mention a valid member of this server.', ephemeral: true });

        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply({ content: 'You must be in a voice channel.', ephemeral: true });

        const members_id = [];
        channel.members.forEach(member => {
            if (!member.voice.deaf) members_id.push(member.id);
        });

        if (!members_id.includes(member_tag.id))
            return interaction.reply({ content: 'That user is not in your voice channel.', ephemeral: true });

        const filter = (reaction, user) => ['✔'].includes(reaction.emoji.name) && members_id.includes(user.id);

        let embedMessage = new EmbedBuilder()
            .setColor(0x4F2A5D)
            .setTitle('Vote Kick')
            .setDescription(`Voting to kick **${member_tag.displayName}**.`);

        const vote_kick_message = await interaction.reply({ embeds: [embedMessage], fetchReply: true });
        await vote_kick_message.react('✔');

        vote_kick_message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
            .then(async () => {
                // TODO: count votes and kick if threshold met
            })
            .catch(() => {});
    },
};
