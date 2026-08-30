const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const product = new Schema({
    title:{
        type:  String,
        required: true,
    },

    description:{
        type: String,
    },

    price:{
        type: Number,
        required: true,
    },

    image: {
        url:{
            type: String,
        },
    },

    stock:{
        type: Number,
        default: 0,
        required: true,
    },
});

const Product = mongoose.model("Product", product);
module.exports = Product;

