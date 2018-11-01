'use strict';

let request = require('request');

module.exports = {
  'doIexist': (id, cb) => {
    console.log(`Running request "doIexist" for id ${id}`);
    request.post('http://localhost:3000/api/doIexist', {
      'headers': {
        'Content-type': 'application/json'
      },
      "body": {
        "machine_id": id
      },
      'json': true
    }, cb);
  },
  'authorizeCreditCard': (id, transactionId, cardInfo, cb) => {
    request.post('http://localhost:3000/api/authorizeCard', {
      'headers': {
        'Content-type': 'application/json'
      },
      "body": {
        "machine_id": id,
        "transaction_id": transactionId,
        "cc": cardInfo
      },
      'json': true
    }, cb);
  },
  'logAction': (id, action, cb) => {
    request.post('http://localhost:3000/api/logAction', {
      "headers": {
        "Content-type": "application/json"
      },
      "body": {
        "machine_id": id,
        "action": action
      },
      "json": true
    }, cb);
  },
  'newTransaction': (id, transaction, cb) => {
    console.log(`Running request "newTransaction" for id ${id}`);
    request.post('http://localhost:3000/api/logTransaction', {
      "headers": {
        "Content-type": "application/json"
      },
      "body": {
        "machine_id": id,
        "transaction": transaction
      },
      "json": true
    }, cb);
  }
}