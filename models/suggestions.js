const mongoose = require('./index');

const suggestionsSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true,
    },
    suggestion: {
        type: String,
        required: true,
    }
})

const Suggestions = mongoose.model('Suggestions', suggestionsSchema);

module.exports = Suggestions;