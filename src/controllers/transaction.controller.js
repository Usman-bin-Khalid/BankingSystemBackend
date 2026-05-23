const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');    
const emailService = require('../services/email.service');

async function createTransaction(req, res) {

    const {fromAccount, toAccout, amount, idemPotencyKey} = req.body;
    if (!fromAccount || !toAccount || !amount || !idemPotencyKey) {
      return  res.status(400).json({ message : 'Missing required fields: fromAccount, toAccount, amount and idemPotencyKey are required'});
    }
    const fromUserAccount = await accountModel.findOne({_id : fromAccount });
     const toUserAccount=  await accountModel.toUserAccount.findOne({_id : toAccout});
     if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({message : 'Invalid fromAccount or toAccount'});
     }

     const isTransactionAlreadyExists = await transactionModel.findOne({
        idemPotencyKey : idemPotencyKey,
     }) ;
     if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === 'COMPLETED' )  {

         return   res.status(200).json({message : 'Transaction already completed', transaction : isTransactionAlreadyExists});
     }
     if (isTransactionAlreadyExists.status === 'PENDING') {
        message : 'Transaction is still processing'
    }
     if (isTransactionAlreadyExists.status === 'FAILED') {
      return res.status(500).json({
        message : 'Transaction failed previously, please try again',
       })
     
    }
    if (isTransactionAlreadyExists.status === 'REVERSED') {
      return  res.status(500).json({
            message : 'Transaction was reversed, please retry'
        })
    }


}

if (fromUserAccount.status !== 'ACTIVE' || toUserAccount.status !== 'ACTIVE') {
    return res.status(400).json({
        message : 'Both fromAccount and toAccount must be active to process the transaction'
    })
}


}