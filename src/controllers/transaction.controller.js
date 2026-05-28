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
    let session;
    let transaction;

    try {
        // 1. Validate Request
        const { fromAccount, toAccount, amount, idemPotencyKey } = req.body;
        if (!fromAccount || !toAccount || !amount || !idemPotencyKey) {
            return res.status(400).json({ message: 'Missing required fields: fromAccount, toAccount, amount and idemPotencyKey are required' });
        }
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }
        if (fromAccount === toAccount) {
            return res.status(400).json({ message: 'fromAccount and toAccount cannot be the same' });
        }

        const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
        const toUserAccount = await accountModel.findOne({ _id: toAccount });
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
                return res.status(409).json({ message: 'Transaction is already pending, please wait' });
            }
            if (isTransactionAlreadyExists.status === 'FAILED') {
                return res.status(409).json({
                    message: 'Transaction failed previously, please retry with a new idemPotencyKey',
                })

            }
            if (isTransactionAlreadyExists.status === 'REVERSED') {
                return res.status(409).json({
                    message: 'Transaction was reversed, please retry with a new idemPotencyKey'
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

        // Simulate processing delay (security checks, fraud detection, etc.)
        // Must run BEFORE session.startTransaction() — MongoDB aborts transactions
        // that exceed transactionLifetimeLimitSeconds (default 60s).
        await new Promise((resolve) => setTimeout(resolve, 2 * 1000));

        // 5. Create Transaction (PENDING)
        session = await mongoose.startSession();
        session.startTransaction();
        // startSession mongodb provide krta hy jis mai ya to sb kuch complete hoga ya sb kuch fail hoga, agar beech mai koi error aata hy to wo automatically roll back kr dega aur agar sb kuch sahi chala to wo commit kr dega
        try {
            transaction = (await transactionModel.create([{
                fromAccount, toAccount, amount, idemPotencyKey, status: 'PENDING'
            }], { session }))[0]

            await ledgerModel.create([{
                account: fromAccount,
                amount: amount,
                type: 'DEBIT',
                transaction: transaction._id,

            }], { session })

            await ledgerModel.create([{
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: 'CREDIT'
            }], { session })


            await transactionModel.findOneAndUpdate({ _id: transaction._id },


                { status: 'COMPLETED' },
                { session }
            )

            await session.commitTransaction();
        } catch (txnError) {
            // Roll back the MongoDB transaction first
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            // Mark the transaction record as FAILED outside the session so it persists
            if (transaction && transaction._id) {
                await transactionModel.findOneAndUpdate(
                    { _id: transaction._id },
                    { status: 'FAILED' }
                ).catch(() => { /* best-effort, ignore secondary failure */ });
            }

            console.error('Transaction failed:', txnError);
            return res.status(500).json({
                message: 'Transaction could not be completed, please try again',
                error: txnError.message
            });
        } finally {
            if (session) session.endSession();
        }

        // 10. Send Email Notification (outside the transaction — money already moved,
        // a failed email must not 500 a successful transfer)
        try {
            await emailService.sendRegistrationEmail(req.user.email, req.user.name, amount, toAccount);
        } catch (emailError) {
            console.error('Email notification failed (transaction still successful):', emailError);
        }

        return res.status(201).json({ message: 'Transaction completed successfully', transaction });

    } catch (err) {
        // Pre-transaction errors: invalid ObjectId cast, duplicate key race, unexpected
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid account ID format' });
        }
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Duplicate idemPotencyKey, transaction already submitted' });
        }
        console.error('createTransaction error:', err);
        return res.status(500).json({
            message: 'Something went wrong while processing the transaction',
            error: err.message
        });
    }
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
    const fromUserAccount = await accountModel.findOne({

         user : req.user._id
    });
    if (!fromUserAccount) {
        return res.status(400).json({message : 'System user account not found'});
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const transaction = new transactionModel({
        fromAccount : fromUserAccount._id,
        toAccount,
        amount ,
        idemPotencyKey,
        status : 'PENDING',
    });
    const debitLedgerEntry = await ledgerModel.create([{
        account : fromUserAccount._id,amount : amount ,
        transaction : transaction._id,type : 'DEBIT' 
    }], {session});
    const creditLedgerEntry = await ledgerModel.create([{
        account : toAccount, amount : amount, transaction : transaction._id, type : 'CREDIT'
    }], {session});
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
