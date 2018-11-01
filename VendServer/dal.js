'use strict';
let mongo = require('./utils/mongoConnector.js'),
  async = require('async');

module.exports = {
  'startConnection': (url, cb) => {
    mongo.mongoConnection(url, cb);
  },
  'getOrCreateInstance': (machId, done) => {
    mongo.getVendInstance(machId, done);
  },
  'newTransaction': (machId, transaction, done) => {
    /****
     * Run steps for new transaction including updateing the mongo machine state and logging the transaction
     * 
     * machId: id from client
    *****/ 
    console.log(`New transaction to be inserted and logged.`);
    async.parallel([
      (cb) => { mongo.logTransaction(machId, transaction, cb); },
      (cb) => {
        if (!transaction.transactionCancelled) {
          return mongo.updateVendState(machId, transaction, cb);
        } else {
          return cb();
        }
      },
      (cb) => { mongo.logAction(machId, `Transaction logged (Machine: ${machId}, Id: ${transaction.transactionId}`, cb) }
    ], done)
  },
  'logAction': (machId, action, done) => {
    mongo.logAction(machId, action, done);
  }
}

