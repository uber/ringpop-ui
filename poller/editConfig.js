// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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
