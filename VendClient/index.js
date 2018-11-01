"use strict";

let VmInterface = require("./interface.js");
let id = process.env.CLIENT_ID || 1234; 

VmInterface.init(id, (iface)=>{
  iface.run();
});
