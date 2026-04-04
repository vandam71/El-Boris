const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Send a private poke to a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to poke').setRequired(true)),
    execute: async function (interaction, client) {
        const member_tag = interaction.options.getMember('user');
        if (!member_tag)
            return interaction.reply({ content: 'Please mention a valid member of this server.', ephemeral: true });

        if (client.pokedRecently.has(member_tag.id))
            return interaction.reply({ content: 'This user was poked in the last minute.', ephemeral: true });
        client.pokedRecently.add(member_tag.id);
        setTimeout(() => { client.pokedRecently.delete(member_tag.id); }, 60 * 1000);

        const call_messages = ['is calling you!', 'needs your attention...', 'requests your presence.', 'demands you to join him!'];

        await member_tag.send(`<@${interaction.user.id}> ${call_messages[Math.floor(Math.random() * call_messages.length)]}`);
        return interaction.reply({ content: '👋 Poked!', ephemeral: true });
    },
};
