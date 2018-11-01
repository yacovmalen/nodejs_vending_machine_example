"use strict";

let uuid = require('uuid'),
  lodash = require('lodash'),
  api = require('./requests.js');

module.exports = class currTransaction {
  /****
   * The current transaction. Handles the console printing for various steps of the transactions. Tracks payment and payment remaining for the current transaction. Triggers the transaction completion if the payment is zero or the transaction is cancelled. 
   */
  constructor(vm) {
    this.transactionId = uuid();
    this.txTime = Date.UTC();
    this._totalDue = null;
    this._totalPaid = [];
    this._optionSelected = null;
    this.transactionCompleted = false;
    this.transactionCancelled = false;
    this._creditPayment = false;
    this._totalCredit = 0;
    this.changeCount = {};
    this.vm = vm;
  }

  set selectOption(option) {
    this._optionSelected = option.name;
    this._extrasSelected = option.extras;
    this._totalDue = parseFloat(option.price).toFixed(2);
  }

  get selectedOption() {
    return `Beverage Selected: ${this._optionSelected}`;
  }

  get totalOwed() {
    return `Total Owed: \$${this._totalDue}`;
  }

  get totalPaid() {
    return parseFloat(this._totalPaid.reduce((t, a) => {
      return t + a;
    }, 0.00)).toFixed(2);
  }

  get paymentByCoin() {
    return lodash.countBy(this._totalPaid, (i) => { return parseFloat(i).toFixed(2) });
  }

  get paidByCash() {
    return this._totalDue - this._totalCredit;
  }

  get paymentRemaining() {
    return this._totalDue - this.totalPaid - this._totalCredit;
  }

  get totalPaidString() {
    return `Paid: \$${parseFloat(this.totalPaid).toFixed(2)} - Remaining: \$${parseFloat(this.paymentRemaining).toFixed(2)}`;
  }

  get transactionInfo() {
    return {
      "id": this.vm.id,
      "transactionId": this.transactionId,
      "selectedOption": this._optionSelected,
      "extras": this._extrasSelected,
      "totalCost": this._totalDue,
      "totalPaid": this.totalPaid,
      "paymentRemaining": this.paymentRemaining,
      "transactionCompleted": this.transactionCompleted,
      "transactionCancelled": this.transactionCancelled,
      "transactionCreditCard": this._creditPayment,
      "paidByCredit": this._totalCredit,
      "paidByCash": this.paidByCash,
      "coinCount": this.paymentByCoin,
      "changeCount": this.changeCount,
      "stockChange": !this.transactionCancelled ? -1 : 0
    }
  }

  get PAYMENT_ACTIONS_MAP() {
    return {
      "cancel": this.cancelTransaction.bind(this),
      "*": this.authorizeCreditCard.bind(this),
      "default": this.coinInserted.bind(this)
    }
  }

  addToTotal(t) {
    this._totalDue = parseFloat(this._totalDue) + parseFloat(t);
  }

  printTransactionHeader() {
    console.log(`
      ${this.selectedOption}
      ${this.totalPaidString}
    `)
  }

  addTotalPaid(c) {
    this._totalPaid.push(c);
  }

  paymentAction(a, callback) {
    /***
     * Determines which function to call based on the input for the payment
     * Functions are mapped to actions in this.PAYMENT_ACTIONS_MAP
     */
    let o = Object.keys(this.PAYMENT_ACTIONS_MAP).indexOf(a) > -1 ? a : 'default';

    this.PAYMENT_ACTIONS_MAP[o](a, () => {
      if (this.paymentRemaining <= 0 || this.transactionCancelled === true) {
        this.transactionCompleted = true
      }
      return callback(null, this.transactionInfo);
    });
  };

  verifyCoin(d) {
    return Object.keys(this.vm.currentCashOnHand).indexOf(d) > -1;
  }

  coinInserted(denomination, cb) {
    if (!this.verifyCoin(denomination)) {
      console.log(`Option not available. Please try again.`);
      return cb();
    }

    let c = parseFloat(denomination)

    if (this.paymentRemaining >= c) {
      this.addTotalPaid(c);
    } else {
      let changeAvail = this.returnChange(this.getCashOnHandList(), Math.abs(this.paymentRemaining - c));

      if (!changeAvail) {
        console.log('Change is not available. Please enter exact change!');
      } else {
        this.addTotalPaid(c);
        this.changeCount = lodash.countBy(changeAvail, (i) => { return parseFloat(i).toFixed(2) });
        console.log(`Please take your change (${changeAvail}).`);
      }
    }
    return cb();
  }

  getCashOnHandList() {
    let t = [];
    let coins = Object.keys(this.vm.currentCashOnHand);
    coins.forEach((c) => {
      for (let j = 0; j < this.vm.currentCashOnHand[c]; j++) {
        t.push(parseFloat(c));
      }
    })
    return t;
  }

  returnChange(numbers, target, partial) {
    /**
     * Determine if there is enough cash on hand to return change. If true. return the change. Else return false and request exact change from the customer
     */
    let s, n, remaining, success;

    partial = partial || [];

    s = partial.reduce((a, b) => {
      return a + b;
    }, 0);

    // Return the change if the partial sum equals the target
    if (s === target) {
      //console.log(partial)
      return partial;
    }

    if (s > target) {
      return false;  // If is partial is not equal to the sum, then lets continue until we find one that is
    }

    for (var i = 0; i < numbers.length; i++) {
      n = numbers[i];
      remaining = numbers.slice(i + 1);
      success = this.returnChange(remaining, target, partial.concat([n]));
      // We only need to find the first occurance. Break the loop once found.
      if (success) {
        break;
      }
    }
    return success;
  }

  authorizeCreditCard(a, cb) {
    /***
     * Api call to verify the credit card. 
     * If the api request is rejected or an error is thrown, the tranaction is cancelled.
     **/
    api.authorizeCreditCard(this.transactionId, this.vm.id, uuid(), (err, res) => {
      if (res.statusCode != 200) {
        console.log(`There was an issue with this transaction (${res.statusCode}). Please start over.`);
        console.log(err);
        return this.cancelTransaction(a, cb);
      }

      console.log(`\n\nPayment authorized for \$${parseFloat(this.paymentRemaining).toFixed(2)}.\n\nPlease take your ${this._optionSelected} and have a nice day.`)

      this._totalCredit = this.paymentRemaining;
      this._creditPayment = true;
      return cb();
    })
  }

  cancelTransaction(a, cb) {
    /***
     * Handle cancelling the user's transaction.
     * Sets the transactionCancelled = true
     * Removeds payment by coin and _totalpaid = 0
     */
    console.log(`\n\nYou have cancelled this transaction (${this.transactionId}).`);

    let cancelMsg = this.totalPaid > 0 ? `Please take your \$${parseFloat(this.totalPaid).toFixed(2)} change and have a nice day!` : `Have a nice day!`;

    console.log(cancelMsg);

    api.logAction(this.vm.id, `Transaction ${this.transactionId} was cancelled by the user.`, () => {
      this.transactionCancelled = true;
      this._totalPaid = [];
      return cb();
    })
  }
}