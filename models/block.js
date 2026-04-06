const mongoose = require('./index');

const TIERS = {
    stone:   { label: 'Stone',   emoji: '🪨', maxHp: 100,  rewardMin: 50,   rewardMax: 150,  weight: 60 },
    iron:    { label: 'Iron',    emoji: '🪙', maxHp: 300,  rewardMin: 200,  rewardMax: 500,  weight: 25 },
    gold:    { label: 'Gold',    emoji: '🟡', maxHp: 700,  rewardMin: 600,  rewardMax: 1200, weight: 12 },
    diamond: { label: 'Diamond', emoji: '💎', maxHp: 1500, rewardMin: 2000, rewardMax: 4000, weight: 3  },
};

const minerSchema = mongoose.Schema({
    userId:   { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt:   { type: Date, default: null },
}, { _id: false });

const messageRefSchema = mongoose.Schema({
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
}, { _id: false });

const blockSchema = mongoose.Schema({
    type:       { type: String, required: true },
    maxHp:      { type: Number, required: true },
    currentHp:  { type: Number, required: true },
    rewardPool: { type: Number, required: true },
    spawnedAt:  { type: Date, default: Date.now },
    endedAt:    { type: Date, default: null },
    active:     { type: Boolean, default: true, index: true },
    miners:     { type: [minerSchema], default: [] },
    messages:   { type: [messageRefSchema], default: [] },
});

blockSchema.statics.getActive = function () {
    return this.findOne({ active: true });
};

blockSchema.statics.spawnRandom = function (forcedType = null) {
    let type, tier;
    if (forcedType && TIERS[forcedType]) {
        type = forcedType;
        tier = TIERS[forcedType];
    } else {
        const entries = Object.entries(TIERS);
        const total = entries.reduce((s, [, t]) => s + t.weight, 0);
        let r = Math.random() * total;
        let chosen = entries[0];
        for (const entry of entries) {
            r -= entry[1].weight;
            if (r <= 0) { chosen = entry; break; }
        }
        [type, tier] = chosen;
    }
    const rewardPool = Math.floor(Math.random() * (tier.rewardMax - tier.rewardMin + 1)) + tier.rewardMin;
    return this.create({ type, maxHp: tier.maxHp, currentHp: tier.maxHp, rewardPool });
};

const Block = mongoose.model('Block', blockSchema);

module.exports = { Block, TIERS };
