"use strict";

let VmInterface = require("./VendClient/interface.js");
let id = null; 

VmInterface.init(id, (iface)=>{
  iface.run();
});
