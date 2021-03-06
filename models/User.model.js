const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    firstName: {
        type: String, 
        required: true
    },
    lastName: {
        type: String, 
        required: true
    },
    birthday: {
        type: Date, 
        required: true
    },
    balance: {
        type: Number, 
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Users', UserSchema);