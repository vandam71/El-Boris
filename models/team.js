const mongoose = require('./index');

const memberSchema = mongoose.Schema({
    userId:   { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const pendingInviteSchema = mongoose.Schema({
    userId:    { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
}, { _id: false });

const teamSchema = mongoose.Schema({
    name:           { type: String, required: true, unique: true },
    tag:            { type: String, required: true, unique: true },
    ownerId:        { type: String, required: true },
    members:        { type: [memberSchema], default: [] },
    pendingInvites: { type: [pendingInviteSchema], default: [] },
    createdAt:      { type: Date, default: Date.now },
});

teamSchema.statics.findByTag = function (tag) {
    return this.findOne({ tag: tag.toUpperCase() });
};

teamSchema.statics.findByMember = function (userId) {
    return this.findOne({ 'members.userId': userId });
};

teamSchema.statics.findByPendingInvite = function (userId) {
    return this.findOne({ 'pendingInvites.userId': userId });
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
