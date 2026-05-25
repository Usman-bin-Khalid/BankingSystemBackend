const transactionModel = require('../models/transactions.models');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');
const emailService = require('../services/email.service');
const mongoose = require('mongoose');

// Create a new transction:
// The 10 STEP TRANSFER FLOW:
// 1. Validate Request
// 2. Validate IdemPotency Key
// 3. Check Account Status
// 4. Derive sender balance from ledger
// 5. Create Transaction (PENDING)
// 6. Create DEBIT ledger entry
// 7. Create CREDIT ledger entry
// 8. Mark Transaction COMPLETED
// 9. Commit MONGODB session
// 10. Send Email Notification

async function createTransaction(req, res) {
    // 1. Validate Request
    const { fromAccount, toAccount, amount, idemPotencyKey } = req.body;
    if (!fromAccount || !toAccount || !amount || !idemPotencyKey) {
        return res.status(400).json({ message: 'Missing required fields: fromAccount, toAccount, amount and idemPotencyKey are required' });
    }
    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
    const toUserAccount = await accountModel.toUserAccount.findOne({ _id: toAccount });
    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({ message: 'Invalid fromAccount or toAccount' });
    }


    // 2. Validate IdemPotency Key

    const isTransactionAlreadyExists = await transactionModel.findOne({

        idemPotencyKey: idemPotencyKey,
    });
    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === 'COMPLETED') {

            return res.status(200).json({ message: 'Transaction already completed', transaction: isTransactionAlreadyExists });
        }
        if (isTransactionAlreadyExists.status === 'PENDING') {
            message: 'Transaction is still processing'
        }
        if (isTransactionAlreadyExists.status === 'FAILED') {
            return res.status(500).json({
                message: 'Transaction failed previously, please try again',
            })

        }
        if (isTransactionAlreadyExists.status === 'REVERSED') {
            return res.status(500).json({
                message: 'Transaction was reversed, please retry'
            })
        }


    }

    // 3. Check Account Status

    if (fromUserAccount.status !== 'ACTIVE' || toUserAccount.status !== 'ACTIVE') {
        return res.status(400).json({
            message: 'Both fromAccount and toAccount must be active to process the transaction'
        })
    }

    // 4. Derive Sender Balance from Ledger
    const balance = await fromUserAccount.getBalance();
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}.  Requested amount is ${amount}`
        })

    }

    // 5. Create Transaction (PENDING)
    const session = await mongoose.startSession();
    session.startTransaction();
    // startSession mongodb provide krta hy jis mai ya to sb kuch complete hoga ya sb kuch fail hoga, agar beech mai koi error aata hy to wo automatically roll back kr dega aur agar sb kuch sahi chala to wo commit kr dega
    const transaction = await transactionModel.create({
        fromAccount, toAccount, amount, idemPotencyKey, status: 'PENDING'
    }, { session })

    const debitLedgerEntry = await ledgerModel.create({
        account: fromAccount,
        amount: amount,
        type: 'DEBIT',
        transaction: transaction._id,

    }, { session })

    const creditLedgerEntry = await ledgerModel.create({
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: 'CREDIT'
    }, { session })

    transaction.status = 'COMPLETED';
    await transaction.save({ session });
    await session.commitTransaction();
    session.endSession();

    // 10. Send Email Notification
    await emailService.sendRegistrationEmail(req.user.email, req.user.name, amount, toAccount);
    return res.status(201).json({ message: 'Transaction completed successfully', transaction });

}


async function createInitialFundsTransaction(req, res) {
    const {toAccount, amount, idemPotencyKey} = req.body;
    if (!toAccount || !amount || !idemPotencyKey) {
        return res.status(400).json({ message: 'Missing required fields: toAccount, amount and idemPotencyKey are required' });
    }
    const toUserAccount = await accountModel.findOne({ _id: toAccount });
    if (!toUserAccount) {
        return res.status(400).json({message : 'Invalid toAccount'});
    }
    const fromUserAccount = await accountModel.findOne({systemUser : true,

         user : req.user._id
    });
    if (!fromUserAccount) {
        return res.status(400).json({message : 'System user account not found'});
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const transaction = await transactionModel.create({
        fromAccount : fromUserAccount._id,
        toAccount,
        amount ,
        idemPotencyKey,
        status : 'PENDING',
    }, {session});
    const debitLedgerEntry = await ledgerModel.create({
        account : fromUserAccount._id,amount : amount ,
        transaction : transaction._id,type : 'DEBIT' 
    }, {session});
    const creditLedgerEntry = await ledgerModel.create({
        account : toAccount, amount : amount, transaction : transaction._id, type : 'CREDIT'
    }, {session});
    transaction.status = 'COMPLETED';
    await transaction.save({session});
    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({message : 'Initial funds transaction completed successfully', transaction : transaction});
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}
