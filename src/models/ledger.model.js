const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'account',
        required : [true, 'Ledger entry must be associated with an account'],
        index : true,
        immutable : true,
    },
    amount : {
        type : Number,
        required : [true, 'Amount is required for creating a ledger entry'],
        immutable : true,
    },
    transaction : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'transaction',
        required : [true, 'Ledger entry must be associated with a transaction'],
        index : true,
        immutable : true,
    },
    type : {
        type : String,
        enum : {
            values : ['DEBIT', 'CREDIT'],
            message : 'Type can be either DEBIT or CREDIT',
        },
        required : [true, 'Type is required for creating a ledger entry'],
         immutable : true,
        
    }
})