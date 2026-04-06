const mongoose = require('./index');

const guildSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        required: true,
        default: '+'
    },
    miningChannelId: {
        type: String,
        default: null
    }
});

guildSchema.statics.findById = function (id) {
    return this.findOne({ id: id });
};

guildSchema.statics.getPrefix = async function (id) {
    let guild = await this.findById(id);
    if (!guild) return '+';
    return guild['prefix'].toString();
};

guildSchema.statics.getMiningChannels = function () {
    return this.find({ miningChannelId: { $ne: null } }, 'id miningChannelId');
};

guildSchema.statics.syncGuild = async function (discordGuild) {
    await this.findOneAndUpdate(
        { id: discordGuild.id },
        { name: discordGuild.name, id: discordGuild.id },
        { upsert: true, setDefaultsOnInsert: true }
    );
};

const Guild = mongoose.model('Guild', guildSchema);

module.exports = Guild;