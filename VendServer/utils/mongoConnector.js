'use strict;'
let lodash = require('lodash');

const MongoClient = require('mongodb').MongoClient;
const defaultMachine = require('./defaultMachine.json');
// Connection url
const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'VendExample';

let client = null;

let gracefulShutdown = () => {
  console.log('Gracefully shutting down the server!')
  if (client) {
    client.close();
  }
  process.exit();
};
process.on('exit', gracefulShutdown);
//catches ctrl+c event
process.on('SIGINT', gracefulShutdown);

let that = {
  "mongoConnection": (url, cb) => {
    /****
     * Create a new mongo connection.
     * Sets the new connection to class variable 'client'
    *****/ 
    MongoClient.connect(url, (err, c) => {
      if (err) {
        console.log(`Mongo connection error:`);
        console.log(err);
        return cb(err);
      }
      client = c;
      cb(null);
    });
  },
  "getVendInstance": (machId, cb) => {
    /****
     * Get or create an new vending machine object.
     * 
     * machId: id from client
    *****/ 
    let newMachineObj = Object.assign(defaultMachine, {
      "machine_id": machId,
      "creation_date": new Date().toISOString(),
      "last_update": new Date().toISOString()
    });

    let col = client.db(dbName).collection('machines');

    col.findOneAndUpdate({ "machine_id": machId.toString() }, {
      $setOnInsert: newMachineObj
    }, {
        new: true,   // return new doc if one is upserted
        upsert: true // insert the document if it does not exist
      }, (err, data) => {
        //Handle issue where new is not returning any value on insert
        if (!data.value) {
          data.value = newMachineObj;
        }
        return cb(err, newMachineObj.creation_date === data.creation_date, data);
      });
  },
  "updateVendState": (machId, state, cb) => {
    /****
     * Update the machine state in the mongo db
     * Update - stock and cash on hand
     * 
     * machId: id from client
     * state: updated state received from client
    *****/ 
    let col = client.db(dbName).collection('machines');

    col.findOne({ "machine_id": machId.toString() }, (err, result) => {
      if (state.coinCount) {
        lodash.forEach(state.coinCount, (count, coin) => {
          result["cash_on_hand"][coin] += count;
        });
      }
      if (state.changeCount) {
        lodash.forEach(state.coinCount, (count, coin) => {
          result["cash_on_hand"][coin] -= count;
        });
      }

      let i = lodash.findIndex(result.inventory, (o) => { return o.name === state.selectedOption })
      result.inventory[i].stock_count += state.stockChange;

      col.updateOne({ "machine_id": machId.toString() }, {
        //Update the machine state - inventory stock count and cash on hand
        $set: {
          "cash_on_hand": result["cash_on_hand"],
          "inventory": result.inventory,
          "last_update": new Date().toISOString()
        }
      }, cb);
    })
  },
  "logTransaction": (machId, transaction, cb) => {
    /****
     * Log each transaction with transaction details in the mongo db
     * 
     * machId: id from client
     * transaction: complete transaction info from the client
    *****/ 
    console.log(`Log new transaction ${transaction.transactionId} from machine ${machId}`);
    let col = client.db(dbName).collection('transactionLogs');
    col.insertOne({
      "machine_id": machId,
      "transaction": JSON.stringify(transaction),
      "timestamp": new Date().toISOString()
    }, cb);
  },
  "logAction": (machId, action, cb) => {
    /****
     * Log messages and actions in the mongo db
     * 
     * machId: id from client
     * action: the action or message to be logged
    *****/ 
    let col = client.db(dbName).collection('logs');
    col.insertOne({
      "machine_id": machId,
      "action": action,
      "timestamp": new Date().toISOString()
    }, cb);
  }
}

module.exports = that;