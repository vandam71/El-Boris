const { User } = require('../../models/user');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { azia_cooldown } = require('../../config.json');
const aziaRecently = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('azia')
        .setDescription('Azia someone')
        .addUserOption(opt => opt.setName('user').setDescription('User to azia (optional)').setRequired(false)),
    execute: async function (interaction, client) {
        if (aziaRecently.has(interaction.user.id))
            return interaction.reply({ content: 'Command under cooldown.', flags: MessageFlags.Ephemeral });

        const targetMember = interaction.options.getMember('user');
        const target = targetMember ? targetMember.user : interaction.user;

        aziaRecently.add(interaction.user.id);
        setTimeout(() => { aziaRecently.delete(interaction.user.id); }, azia_cooldown * 1000);

        const user = await User.findOneAndUpdate({ id: target.id }, { $inc: { azia: 1 } });
        if (!user)
            return interaction.reply({ content: "This user hasn't talked in this server yet.", flags: MessageFlags.Ephemeral });

        return interaction.reply(`O <@${target.id}> já aziou ${user.azia + 1} vezes.`);
    }
};
