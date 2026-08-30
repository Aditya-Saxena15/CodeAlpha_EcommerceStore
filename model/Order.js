const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const order = new Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },

    items: [
        {
            product: {
                type: mongoose.Types.ObjectId,
                ref: "Product",
                required: true,
            },

            quantity:{
                type: Number,
                required: true,
                min: 1,
            },

            price:{
                type: Number,
                required: true,
            },

        },
    ],

    totalAmount: {
        type: Number,
        required: true,
    },

    address: {

        FullName:{
            type: String,
            required: true,
        },

        Phone:{
            type: Number,
            required: true,
        },

        Street:{
            type: String,
            required: true,
        },

        City:{
            type: String,
            required: true,
        },

        State:{
            type: String,
            required: true,
        },

        PINcode:{
            type: String,
            required: true,
        },
    },

    status: {
        type: String,
        enum: ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Placed",
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Order = mongoose.model("Order", order);
module.exports = Order;
