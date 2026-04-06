const { SlashCommandBuilder ,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Send a private poke to a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to poke').setRequired(true)),
    execute: async function (interaction, client) {
        const member_tag = interaction.options.getMember('user');
        if (!member_tag)
            return interaction.reply({ content: 'Please mention a valid member of this server.', flags: MessageFlags.Ephemeral });

        if (client.pokedRecently.has(member_tag.id))
            return interaction.reply({ content: 'This user was poked in the last minute.', flags: MessageFlags.Ephemeral });
        client.pokedRecently.add(member_tag.id);
        setTimeout(() => { client.pokedRecently.delete(member_tag.id); }, 60 * 1000);

        const call_messages = ['is calling you!', 'needs your attention...', 'requests your presence.', 'demands you to join him!'];

        try {
            await member_tag.send(`<@${interaction.user.id}> ${call_messages[Math.floor(Math.random() * call_messages.length)]}`);
            return interaction.reply({ content: '👋 Poked!', flags: MessageFlags.Ephemeral });
        } catch {
            return interaction.reply({ content: 'Could not DM that user — their DMs may be closed.', flags: MessageFlags.Ephemeral });
        }
    },
};
