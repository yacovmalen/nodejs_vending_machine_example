'use strict';

module.exports = (info, done) => {
  /****
     * Method to authenticate (or request external api authentication)
     * 
     * info: cc info from client
    *****/ 
  console.log(`Authorizing credit card ${info}`);
  done(null, true);
}