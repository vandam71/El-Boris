const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { poke_cooldown } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Send a private poke to a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to poke').setRequired(true)),
    execute: async function (interaction, client) {
        const member_tag = interaction.options.getMember('user');
        if (!member_tag)
            return interaction.reply({ content: 'Please mention a valid member of this server.', flags: MessageFlags.Ephemeral });

        if (client.pokedRecently.has(member_tag.id)) {
            const remaining = Math.ceil((client.pokedRecently.get(member_tag.id) - Date.now()) / 1000);
            return interaction.reply({ content: `This user was already poked recently. Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
        }
        const expiry = Date.now() + poke_cooldown * 1000;
        client.pokedRecently.set(member_tag.id, expiry);
        setTimeout(() => { client.pokedRecently.delete(member_tag.id); }, poke_cooldown * 1000);

        const call_messages = ['is calling you!', 'needs your attention...', 'requests your presence.', 'demands you to join him!'];

        try {
            await member_tag.send(`<@${interaction.user.id}> ${call_messages[Math.floor(Math.random() * call_messages.length)]}`);
            return interaction.reply({ content: '👋 Poked!', flags: MessageFlags.Ephemeral });
        } catch {
            return interaction.reply({ content: 'Could not DM that user — their DMs may be closed.', flags: MessageFlags.Ephemeral });
        }
    },
};
