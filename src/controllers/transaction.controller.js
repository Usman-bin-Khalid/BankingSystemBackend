const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');
const emailService = require('../services/email.service');

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


}