const { User } = require('../models/user');
const _Transaction = require('../models/transaction');
const logger = require('../logger');

module.exports = class Transaction {
    constructor(id, value, reason) {
        this.id = id;
        this.value = value;
        this.reason = reason;
    }

    async process() {
        const updated = await User.findOneAndUpdate({ id: this.id }, { $inc: { coins: this.value } });
        if (!updated) {
            logger.warn(`Transaction skipped: user ${this.id} not found in DB`);
            return this.value;
        }
        await _Transaction.create({ user: this.id, value: this.value, description: this.reason });
        logger.transaction(`${this.id.toString()} -> ${this.value}BC "${this.reason}"`);
        return this.value;
    }
}