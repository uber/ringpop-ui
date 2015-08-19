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

var _ = require('lodash');
var TChannel = require('tchannel');
var log = require('./../util/logger');

function writeCluster(req, res, services, cb) {
    log('Enter write controller cluster');
    var serviceName = req.body.serviceName;
    var datacenter = req.body.datacenter;
    var connectorNode = req.body.connectorNode;
    var service = {};
    services = JSON.parse(services);

    for (var i = 0; i < services.length; i++) {
        if (services[i].serviceName === serviceName) {
            service = services[i];
            break;
        }
    }
    service.datacenters.push({"name": datacenter, "connectorNode": connectorNode, "hosts": [], "racks": []});
    if (_.isEmpty(service)) {
        return cb({message: 'No matching service found'});
    }
    return cb(null, services, {message: "Success writing cluster"});
}

function deleteCluster(req, res, services, cb) {
    log('Enter delete cluster controller');
    services = JSON.parse(services);
    var address = req.body.address;
    var service = req.body.service;
    if(service && service.indexOf('#') !== -1) {
        service = service.substring(0, service.length -1);
        console.log(service);
    }
    else if(service && service.indexOf('?') !== -1) {
        service = service.substring(0, service.length - 1);
    }

    // should return only one item in array - the matched service
    var serviceMatch = services.filter(function(obj) {
        return (obj.serviceName === service);
    });

    // return all dc's that do not have the same connector node
    var datacenterMatch = serviceMatch[0].datacenters.filter(function(obj) {
        return obj.connectorNode !== address; 
    });

    // append new list of filtered dc's to object
    services.map(function(obj) {
        if(obj.serviceName === service) {
            obj.datacenters = datacenterMatch;
        }
    });
    return cb(req, res, services);
}

function editCluster(req, res, services, cb) {
    services = JSON.parse(services);
    var cluster = req.body.cluster;
    var address = req.body.address;
    var service = req.body.service;
    var oldCluster = req.body.oldCluster;

    log("Enter cluster controller - edit");

    // sanitize service name
    if (service && service.indexOf('?') !== -1) {
        service = service.substring(0, service.length - 1);
    }

    var refService = services.filter(function(serv) {
        return serv.serviceName === service;
    });

    if(!cluster && !address) {
        return res.send({message: "Must change at least either address or cluster"});
    }

    // This branching assumes that cluster or address are available
    if(cluster && address) {
        services[service] = changeClusterAndAddressHelper(cluster, address, refService[0].datacenters, oldCluster, req, res);
    }
    else if(cluster) {
        services[service] = changeClusterNameHelper(cluster, refService[0].datacenters, oldCluster, req, res);
    }
    else {
        services[service] = changeAddressHelper(address, refService[0].datacenters, oldCluster);
    }
    return cb(req, res, services);
}

function willEditNameToExistingDatacenter(cluster, datacenters) {
  for(var i = 0; i < datacenters.length; i++) {
    if(datacenters[i].name === cluster) {
      return true;
    } 
  }
  return false;
}

function changeClusterAndAddressHelper(cluster, address, datacenters, oldCluster, req, res) {
  if (willEditNameToExistingDatacenter(cluster, datacenters)) {
      return res.send({message: "Cannot edit name to an existing datacenter"});
  }
  for (var i = 0; i < datacenters.length; i++) {
    if (datacenters[i].name === oldCluster) {
      datacenters[i].name = cluster;
      datacenters[i].connectorNode = address;
    }
  }
}

function changeClusterNameHelper(cluster, datacenters, oldCluster, res) {
  if (willEditNameToExistingDatacenter(cluster, datacenters)) {
    return res.send({message: "Cannot edit name to an existing datacenter"});
  }

  for (var i=0; i < datacenters.length; i++) {
    if(datacenters[i].name === oldCluster) {
      datacenters[i].name = cluster;
    }
  }
}

function changeAddressHelper(address, datacenters, oldCluster) {
  for (var i=0; i < datacenters.length; i++) {
    if(datacenters[i].name === oldCluster) {
      datacenters[i].connectorNode = address;
    }
  }
}

function lookup(req, res) {
    var key = req.query.key;
    var instanceAddress = req.query.address;
    log('Enter cluster controller - lookup - ' + JSON.stringify(req.query));

    if(!(key && instanceAddress)) {
        return res.send({message: "Must provide a key/address for ring lookup"});
    }
    var tclient = new TChannel({
        host: '127.0.0.1',
        port: 31998
    });

    tclient.send({
          host: instanceAddress
      }, '/admin/lookup', null, key, function onSend(err, res1, res2) {
          if (err) {
              return res.send({message: 'There was an error while looking up this key'});
          }
          tclient.quit();
          return res.send(JSON.parse(res2));
    });
}

module.exports = {
    writeCluster: writeCluster,
    deleteCluster: deleteCluster,
    editCluster: editCluster,
    lookup: lookup
};
