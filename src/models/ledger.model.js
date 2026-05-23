const mongoose = require('mongoose');
const { findOneAndUpdate } = require('./user.model');

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
});

function preventLedgerModification(next) {
    throw new Error('Ledger entries are immutable and cannot be modified or deleted');
    
}

ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('remove' , preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);

const ledgerModel = mongoose.model('ledger', ledgerSchema);

module.exports = ledgerModel;