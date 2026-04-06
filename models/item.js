const mongoose = require('./index');

const itemSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    id: {
        type: Number,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    emote: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }
});

itemSchema.statics.findById = function (id) {
    return this.findOne({ id: id });
};

itemSchema.statics.findByName = function (name) {
    return this.findOne({ name: name });
}

itemSchema.statics.getItemString = async function (id, quantity) {
    let item = await this.findById(id);
    if (!item) return `${quantity} [unknown item]\n`;
    return quantity + ' ' + item.emote + ' ' + item.name + '\n';
};

itemSchema.statics.getCategory = async function (id) {
    let item = await this.findById(id);
    if (!item) return null;
    return item.category;
}

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;