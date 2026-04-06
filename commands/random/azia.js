const { User } = require('../../models/user');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { azia_cooldown } = require('../../config.json');
const aziaRecently = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('azia')
        .setDescription('Azia a user and track how many times they have been aziad')
        .addUserOption(opt => opt.setName('user').setDescription('User to azia (defaults to yourself)').setRequired(false)),
    execute: async function (interaction, client) {
        if (aziaRecently.has(interaction.user.id)) {
            const remaining = Math.ceil((aziaRecently.get(interaction.user.id) - Date.now()) / 1000);
            return interaction.reply({ content: `This command is on cooldown. Try again in **${remaining}s**.`, flags: MessageFlags.Ephemeral });
        }

        const targetMember = interaction.options.getMember('user');
        const target = targetMember ? targetMember.user : interaction.user;

        const expiry = Date.now() + azia_cooldown * 1000;
        aziaRecently.set(interaction.user.id, expiry);
        setTimeout(() => { aziaRecently.delete(interaction.user.id); }, azia_cooldown * 1000);

        const user = await User.findOneAndUpdate({ id: target.id }, { $inc: { azia: 1 } });
        if (!user)
            return interaction.reply({ content: "This user hasn't talked in this server yet.", flags: MessageFlags.Ephemeral });

        return interaction.reply(`O <@${target.id}> já aziou ${user.azia + 1} vezes.`);
    }
};
