'use strict';
var fs = require('fs');
var async = require('async');
var path = require('path');
var config = require('./poller-config.json');
var async = require('async');
var _ = require('lodash');
var readline = require('readline');
var serviceName;
var datacenterName;
var address;
var pollingSpeed;

console.log("Edit Config Start! Current Config:\n");
console.log("Service: " + config.serviceName);
console.log("Datacenter: "+config.datacenterName);
console.log("IP Address: "+config.address+"\n");

getService();

function getService() {
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question("Please enter the new Service name: ", function(answer) {
      console.log("New Service: "+answer+"\n");
      serviceName = answer;
      rl.close();
      getDatacenter();
  });
}

function getDatacenter() {
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question("Please enter the new Datacenter name: ", function(answer) {
      console.log("New Datacenter: "+answer+"\n");
      datacenterName = answer;
      rl.close();
      getIP();
  });
}

function getIP() {
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question("Please enter the IP address of a viable node in the cluster: ", function(answer) {
      console.log("New IP: "+answer+"\n");
      address = answer;
      var json = {serviceName: serviceName, datacenterName: datacenterName, address: address, pollingSpeed: config.pollingSpeed};
      fs.writeFile(path.join(__dirname, './poller-config.json'), JSON.stringify(json), function(err) {
                if(err) {
                    console.log('Error');
                }
                console.log("Thank you! Have a nice day!");
                rl.close();
      });
  });

}

module.exports = {
    getService: getService
};
