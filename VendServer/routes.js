'use strict';

let creditCard = require('./authCreditCard.js'),
  dal = require('./dal.js'),
  express = require('express'),
  router = express.Router();

let logRequest = (log) => {
  console.log(`${new Date().toISOString()} - Log Request:`);
  console.log(log);
}

router.get('/api/isAlive', (req, res) => {
  logRequest(req.url);
  res.status(200).end();
})

router.post('/api/doIexist', (req, res) => {
  logRequest(`${req.url} - ${JSON.stringify(req.body)}`);
  dal.getOrCreateInstance(req.body.machine_id, (err, newMachine, data) => {
    if (err) {
      console.log(`Server Error (${err})`)
      return res.status(500).end();
    }

    res.status(newMachine ? 201 : 200).send(data).end();
  });
})

router.post('/api/logTransaction', (req, res) => {
  logRequest(`${req.url} - ${JSON.stringify(req.body)}`);
  dal.newTransaction(req.body.machine_id, req.body.transaction, (err) => {
    if (err) {
      return res.status(500).send(err).end();
    }

    res.status(200).end();
  });
})

router.post('/api/logAction', (req, res) => {
  logRequest(`${req.url} - ${JSON.stringify(req.body)}`);
  dal.logAction(req.body.machine_id, req.body.action, (err) => {
    if (err) {
      return res.status(500).send(err).end();
    }

    res.status(201).end();
  });
})

router.post('/api/authorizeCard', (req, res) => {
  logRequest(`${req.url} - ${JSON.stringify(req.body)}`);
  creditCard(req.body.cc, (err, authorized) => {
    if (err) {
      return res.status(500).send(err).end();
    }
    dal.logAction(req.body.machine_id, `Credit Authorization ${authorized} for cc ${req.body.cc}`, (err) => { console.log(`Action logged after credit card auth.`) })
    res.status(!authorized ? 401 : 200).end();
  });
})

module.exports = router;