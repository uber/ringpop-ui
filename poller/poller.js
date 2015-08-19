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
var TChannel = require('tchannel');
var fs = require('fs');
var async = require('async');
var path = require('path');
var config = require('./poller-config.json');
var RedisClient = require('../server/util/redis_client');
var _ = require('lodash');

console.log("Poller Start!\n");
console.log("Service: " + config.serviceName);
console.log("Datacenter: "+config.datacenterName);
console.log("IP Address: "+config.address+"\n");

if (!config.serviceName || !config.datacenterName || !config.address) {
   console.log("No config data found, please run 'npm run config'!");
   process.exit();
}
else { 
  RedisClient = new RedisClient(null, null);
  RedisClient.connect();
  var serviceName = config.serviceName;
  var datacenterName = config.datacenterName;
  var address = config.address;
  var pollingSpeed = config.pollingSpeed;
  var pollingDelay = 0;
  var lastSize;
  var lastStatuses;
  var membership;
  var started = false;
  initializeClusterHistory(initializeMembership);
}

function beginPolling() {
  var speed = Number(pollingSpeed) + Number(pollingDelay);
  console.log("Begun polling with a delay of "+speed);
  setInterval(function(){ updateMembership(); }, speed);
}

function updateMemberHistory(members,statuses) {
  function cb(reply) {
      for (var i = 0; i < reply.length; i++) {
          var thisNode = reply[i];
          var thisHistory = thisNode.history;
          if (thisHistory) {
              if (thisHistory.length > 0) {
                  var lastHistory = thisHistory[thisHistory.length-1];

                  if (lastHistory) {
                    var lastStatus = JSON.parse(lastHistory).status;
                  }
                  else { lastStatus = "none"}

                  console.log("Address: "+thisNode.address+", last recorded status: "+lastStatus);

                  if (statuses[i] != lastStatus) {
                      console.log("\nCurrent status of "+statuses[i]+" is different than the last status of "+lastStatus+"");
                      console.log("Recording new entry for address "+thisNode.address+" with a status of "+statuses[i]+"\n");

                      var toAppend = {timestamp: Date.now(), status: statuses[i]};
                      RedisClient.appendToList(thisNode.address + "",JSON.stringify(toAppend));
                  }
              } else { 
                 console.log("\nHistory size is 0. Recording new entry for address "+thisNode.address+" with a status of "+statuses[i]+"\n");
                  var toAppend = {timestamp: Date.now(), status: statuses[i]};
                  RedisClient.appendToList(thisNode.address + "",JSON.stringify(toAppend));
              }
          } else {
              console.log("\nNo history found. Recording new entry for address "+thisNode.address+" with a status of "+statuses[i]+"\n");
              var toAppend = {timestamp: Date.now(), status: statuses[i]};
              RedisClient.appendToList(thisNode.address + "",JSON.stringify(toAppend));
          }
      }

      lastStatuses = statuses;
      console.log("==========================\n");
      if (!started) {
          started = true;
          beginPolling();
      }
  };

  function fetch(done) {
        async.mapLimit(members, 1000, RedisClient.readList3.bind(RedisClient), function(err, result) {
            done(result);
        });
  }
  fetch(cb);

}

function updateMembership() {
  console.log("updateMembership() with address: "+address)
  var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

    client.send({host: address}, '/admin/stats', null, null, function onSend(err, res1, res2) {
        if(err) {
            console.log("Could not connect: "+err);
            if (membership) {
              for (var i = 0; i < membership.length; i++) {
                  if (membership[i].address != address) {
                      if (membership[i].status != 'faulty') {
                          address = membership[i].address;
                          console.log("Failing over to new connector node: "+address);
                      }
                  } else {
                      membership[i].status = 'faulty';
                  }
              }
            }
          }
          else {
            var jsonRes = JSON.parse(res2);
            membership = jsonRes.membership.members;

            var addresses = [];
            var statuses = [];
            for (var i = 0; i < membership.length; i++) {
                addresses.push(membership[i].address);
                statuses.push(membership[i].status);
            }
            console.log("\nUpdating Member History");
            console.log("==========================")
            console.log("Cluster size: "+membership.length+"\n");
            if (lastSize != membership.length) {
               console.log("Node count changed");
               var sizeJSON = {timestamp: Date.now(), size: membership.length};
               RedisClient.appendToList(serviceName+ "-" + datacenterName,JSON.stringify(sizeJSON));
               RedisClient.readList(serviceName+ "-" + datacenterName);
               lastSize = membership.length;
            }
            
            if (membership) {
              for (var i = 0; i < membership.length; i++) {
                  
                  if(membership[membership.length-1].address == address) {
                      address = membership[0].address;
                      console.log("Switching to next connector node in round-robin cycle: "+address);
                      i == membership.length+10;
                      break;
                  } else 
                  if (i > 0) {
                      if (membership[i-1].address == address) {
                          address = membership[i].address; 
                          if (membership[i].status != 'faulty') {
                              console.log("Switching to next connector node in round-robin cycle: "+address);
                              i == membership.length;
                              break;
                          }
                      }
                  } else 
                  if (membership.length > 1) {
                      if (membership[0].address == address) {
                          address = membership[1].address; 
                          if (membership[1].status != 'faulty') {
                              console.log("Switching to next connector node in round-robin cycle: "+address);
                              i == membership.length;
                              break;
                          }
                      }
                  }

              }
            }
            

            updateMemberHistory(addresses,statuses);
        }
    });
}

function initializeClusterHistory(callback) {
  function myCb(reply) {
      var json = {sizeHistory: reply};
      if(reply.length > 0) {
        lastSize = reply[reply.length-1];
        console.log("Most recent cluster size: "+lastSize+"\n");
      } else {
        lastSize = 0;
      }
      callback();
  };
  console.log("       *        ");
  console.log("    *     *     ");
  console.log("  *         *   ");
  console.log("*             * ");
  console.log("  *         *   ");
  console.log("    *     *     ");
  console.log("       *        ");
  console.log("Initializing...");
  RedisClient.readList2(""+serviceName + "-" + datacenterName, myCb);
}

function initializeMembership() {
  var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

  client.send({host: address}, '/admin/stats', null, null, function onSend(err, res1, res2) {
      if(err) {
        console.log("Could not connect, please double-check your config address!");
        process.exit();
      }
      else {
        var jsonRes = JSON.parse(res2);
        membership = jsonRes.membership.members;
        var addresses = [];
        var statuses = [];

        pollingDelay = membership.length * 10;
        for (var i = 0; i < membership.length; i++) {
            addresses.push(membership[i].address);
            statuses.push(membership[i].status);
        }

        if (lastSize != membership.length) {
           console.log("node count changed");
           var sizeJSON = {timestamp: Date.now(), size: membership.length};
           RedisClient.appendToList(serviceName+ "-" + datacenterName,JSON.stringify(sizeJSON));
        }
        updateMemberHistory(addresses,statuses);
      }
      
  });
}
