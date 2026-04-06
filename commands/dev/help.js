const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all commands or details on a specific one')
        .addStringOption(opt => opt.setName('command').setDescription('Command name').setRequired(false).setAutocomplete(true)),
    autocomplete: async function (interaction) {
        const { slashCommands } = require('../../commands');
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = [...slashCommands.keys()].filter(k => k.includes(focused));
        await interaction.respond(choices.slice(0, 25).map(k => ({ name: k, value: k })));
    },
    execute: async function (interaction, client) {
        // lazy-require to avoid circular dependency at load time
        const { slashCommands } = require('../../commands');

        const commandName = interaction.options.getString('command');

        if (!commandName) {
            let commandList = [...slashCommands.keys()].map(k => `\`${k}\``).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0xFFFE00)
                .setAuthor({ name: 'Help', iconURL: client.user.displayAvatarURL() })
                .addFields({ name: 'All available commands', value: commandList })
                .setFooter({ text: 'Use /help <command> for details on a specific command' });
            return interaction.reply({ embeds: [embed] });
        }

        const cmd = slashCommands.get(commandName);
        if (!cmd) return interaction.reply({ content: 'This command is not in the command list.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0xFFFE00)
            .setAuthor({ name: `Help: /${commandName}`, iconURL: client.user.displayAvatarURL() })
            .addFields({ name: `/${cmd.data.name}`, value: cmd.data.description });
        return interaction.reply({ embeds: [embed] });
    }
};
