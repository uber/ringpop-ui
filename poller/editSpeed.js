'use strict';
var fs = require('fs');
var path = require('path');
var config = require('./poller-config.json');
var async = require('async');
var _ = require('lodash');
var readline = require('readline');

console.log("Current Polling Speed: "+config.pollingSpeed);

var pollingSpeed = config.pollingSpeed;
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.question("Please enter the new polling speed: ", function(answer) {
    console.log("New polling speed: ", answer);
    console.log("\n");
    pollingSpeed = answer;
    rl.close();
    finished();
});

function finished() {
    var json = {serviceName: config.serviceName, datacenterName: config.datacenterName, address: config.address, pollingSpeed: pollingSpeed};
    fs.writeFile(path.join(__dirname, './poller-config.json'), JSON.stringify(json), function(err) {
          if(err) {
              console.log('Error');
          }
          console.log("Thank you! Have a nice day!");
    });
}