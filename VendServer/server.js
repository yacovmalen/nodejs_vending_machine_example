const express = require('express');
const app = express();

let routes = require('./routes.js'),
  dal = require('./dal.js'),
  port = process.env.SERVER_PORT || 3000,
  bodyParser = require('body-parser');

const mongoUrl = 'mongodb://localhost:27017';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Create a mongo connection before starting the app
dal.startConnection(mongoUrl, (err) => {
  if (err) {
    console.log(err);
    console.log(`Error received.\nShutting down!`);
    return err;
  }
  app.use('/', routes);
  app.listen(port);
  console.log(`RESTful API server started on port ${port}`);
})
