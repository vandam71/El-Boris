const mongoose = require('./index');

const transactionSchema = mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;