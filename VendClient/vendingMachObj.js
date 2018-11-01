'use strict;'
let lodash = require('lodash'),
  async = require('async'),
  api = require('./requests.js');

module.exports = class VendMachine {
  /***
   * Class handles the local Vending Machine object state.
   */
  constructor(id, data) {
    this.id = id || 1234;
    this.vendOptions = data.inventory;
    this.currentCashOnHand = data.cash_on_hand;
  }

  static init(id, cb) {
    return VendMachine._doIexist(id, (data) => {
      return cb(new VendMachine(id, data));
    });
  }

  get whoAmI() {
    return this.id;
  }

  static _doIexist(id, cb) {
    //Function to get and return the vending object from the server if it exists
    //If not, it will create the object and return the default options

    api.doIexist(id, (err, res) => {
      if (err) {
        console.log('Request returned an error.');
        console.log(err);
      }
      console.log(`Request returned ${res.statusCode} - ${JSON.stringify(res.body)}`);
      cb(res.body.value);
    });
  }

  get acceptedCash() {
    return Object.keys(this.currentCashOnHand);
  }

  _addMoney(denomination, total) {
    this.currentCashOnHand[denomination] += total;
  }

  _subtractMoney(denomination, total) {
    this.currentCashOnHand[denomination] -= total;
  }

  completeTransaction(transaction, done) {
    //Update the local object and server with the completed transaction

    async.series([
      (cb) => {
        api.newTransaction(this.id, transaction, (err, res) => {
          if (err) {
            console.log('Request returned an error.');
            console.log(err);
          }
          console.log(`Request returned ${res.statusCode} - ${JSON.stringify(res.body)}`);
          cb();
        });
      },
      (cb) => {
        if (!transaction.transactionCancelled) {
          this.updateStock(transaction.selectedOption, "remove", 1);
          lodash.forEach(transaction.coinCount, (c, d) => { return this._addMoney(d, c); });
          lodash.forEach(transaction.changeCount, (c, d) => { return this._subtractMoney(d, c); });
          console.log(`Thank you for your patronage. Please take your selected beverage ${transaction.selectedOption} and have a nice day!`)
        } else {
          console.log(`Transaction ${transaction.transactionId} has been cancelled.`);
        }
        return cb();
      }
    ], (err, res) => {
      if (err) {
        console.error(`Error saving transaction: ${err}`);
        return done(err);
      }

      console.log(`Transaction (${transaction.transactionId} completed.`);
      return done();
    })
  }

  getFullOptionList() {
    return lodash.groupBy(this.vendOptions, (a) => { return a.active });
  }

  getActiveOptionList() {
    return lodash.filter(this.vendOptions, (a) => { return a.active });
  }

  isOptionAvailable(option) {
    return option && option.active && option.stock_count > 0;
  }

  getSelectedBeverageObj(code) {
    let selected = lodash.find(this.getActiveOptionList(), (a) => { return a.sku_code.toString() === code || a.name === code; });

    return this.isOptionAvailable(selected) ? selected : false;
  }

  getSelectedExtra(extras, code) {
    return lodash.find(extras, (e) => { return e.code.toString() === code || e.name === code; });
  }

  updateStock(option, utype, count) {
    return {
      "remove": (vendObj, count) => {
        vendObj.stock_count -= count;

        if (vendObj.stock_count === 0) {
          //TODO: Send log to server for count 0
        }
      },
      "add": (vendObj, count) => {
        vendObj.stock_count += count;
        //TODO: Send update to api about new inventory and count
      }
    }[utype](this.getSelectedBeverageObj(option), count);
  }
} 