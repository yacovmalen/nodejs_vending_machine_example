"use strict";
let VendMachine = require("./vendingMachObj.js");
let currTransaction = require("./currentTransaction.js");
let rl = require('readline-sync');
let async = require('async');

console.reset = () => {
  //process.stdout.write('\x1b[2J');
  console.log('\n\n\n\n\n\n\n');
}

module.exports = class VmInterface {
  constructor(vm) {
    this.vm = vm
    this.isAlive = true;
    this.optionNotSelected = true;
    this.beverageObj = null;
  }

  static init(id, cb) {
    VendMachine.init(id || 1234, (vm) => {
      return cb(new VmInterface(vm))
    });
  }

  run() {
    /****
     * Main run function for the client interface
     */

    async.whilst(
      () => { return this.isAlive },
      (cb) => {
        this.beverageObj = null;
        console.reset();
        async.whilst(
          () => { return this.optionNotSelected },
          (iCb) => {
            this.displayOptions();
            let selection = rl.prompt({ prompt: 'Enter a code: ' });

            switch (selection) {
              case 'new-inventory':
                this.newInventory();
                break;
              case 'state':
                console.log(this.vm);
                break;
              default:
                this.beverageObj = this.vm.getSelectedBeverageObj(selection);

                if (this.beverageObj) {
                  this.optionNotSelected = false;
                } else {
                  console.log(`\nWe are sorry, but the option you have selected is not available. Please select again.\n`)
                }
                break;
            }
            iCb();
          }, () => {
            if (this.beverageObj) {
              this.startTransaction(this.beverageObj, () => {
                this.optionNotSelected = true;
                return cb()

              })
            }
          });
      },
      () => {
        console.log(`Application is exiting.`)
      })
  }

  newInventory() {
    /***
     * Handle input for updating the local inventory with the command line
     */
    let code = null;
    let count = 0;

    while (!code || !(count > 0)) {
      code = rl.prompt({ prompt: 'Enter the SKU code or name: ' });
      count = rl.prompt({ prompt: 'Enter count: ' });
      if (!code || !(count > 0)) {
        console.log('Please enter valid data.');
        continue;
      }
      else {
        this.vm.updateStock(code, "add", parseInt(count));
      }
    }
  }

  displayOptions() {
    console.log(`Vending Machine Id: ${this.vm.whoAmI}\n`)
    console.log(`Select a beverage:\n`)
    console.log(`Code\tBrand\tPrice\n`)

    let o = this.vm.getFullOptionList();

    o['true'].forEach((opt) => {
      if (opt.stock_count > 0) {
        console.log(`${opt.sku_code}:\t${opt.name}\t\$${parseFloat(opt.price).toFixed(2)}`)
      } else {
        console.log(`${opt.sku_code}:\t${opt.name}\t\$${parseFloat(opt.price).toFixed(2)} (Out of Stock)`)
      }
    });

    if (o['false']) {
      console.log(`\n\n-----------\n`);
      console.log(`We are getting bigger and getting hotter. Try our new beverages coming soon!\n`)
      o['false'].forEach((opt) => {
        console.log(`${opt.name}\t (\$${parseFloat(opt.price).toFixed(2)})`);
      });
      console.log(`\n-----------\n`);
    }
  }

  displayExtras(option) {
    option.additional_options.forEach((opt) => {
      console.log(`${opt.code}:\t${opt.name}\t\$${parseFloat(opt.price).toFixed(2)}`)
    })
  }

  startTransaction(beverageObj, done) {
    /***
     * New transactions - creates a transaction object. Waits for input of coins or * for credit card. Triggers complete transaction with payment remaining = 0
     * 
     * input beverageObj - the object of the selected beverage by code or by name
     */
    let transaction = new currTransaction(this.vm);
    transaction.selectOption = beverageObj;

    console.reset();
    console.log(`You have selected to purchase "${beverageObj.name}".`)

    if (this.beverageObj.additional_options) {
      transaction.addToTotal(this.addAdditionalOpts(beverageObj));
    }

    async.whilst(
      () => {
        return !transaction.transactionCompleted
      },
      (cb) => {
        transaction.printTransactionHeader();

        let p = rl.prompt({ prompt: `Please enter a your money one coin at a time.\nAcception denominations are [${Object.keys(this.vm.currentCashOnHand)}]. Enter '*' to pay by CC.\nYou may cancel this transaction by entering 'cancel': ` });

        transaction.paymentAction(p, cb);
      },
      (err, transaction) => {
        if (err) {
          console.log(`There was an error: ${err}`);
          return err
        }

        this.vm.completeTransaction(transaction, done);
      }
    )
  }

  addAdditionalOpts(selectedOpt) {
    /***
     * Handles the input of additional options as per defined in the option 
     */
    let inExtras = true;
    let extraCosts = [];
    let p = null;

    while (inExtras) {
      this.displayExtras(selectedOpt);
      let selection = rl.prompt({ prompt: 'Enter \'D\' to move on to the next step. Enter a code: ' });

      switch (selection) {
        case 'd':
        case 'D':
          inExtras = false;
          break;
        default:
          p = this.vm.getSelectedExtra(selectedOpt.additional_options, selection);

          if (!p) {
            console.log(`\nWe are sorry, but the option you have selected is not available. Please select again.\n`)
          } else {
            extraCosts.push(p.price);
            console.reset();
          }
          break;
      }
    }
    return extraCosts.reduce((x, y) => { return x + y }, 0);
  }
}