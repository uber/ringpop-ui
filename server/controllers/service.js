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

var log = require('./../util/logger');

function readServices(req, res, redisClient) {
    redisClient.getV_CB2(req, req, 'services', function onReadServices(req2, res2, services) {
        if (typeof services === 'object') {
            return res.json(services);
        }
        return res.json(JSON.parse(services));
    });
}

function writeServices(req, res, services, cb) {
    var service = req.body.serviceName;
    var datacenters = req.body.datacenters;
    var addresses = req.body.addresses;

    log('Enter service controller - write');
    if (JSON.stringify(services) === '[]') {
        services = [];
    } else {
        services = JSON.parse(services);
    }

    if (!service) {
        return res.send({message: 'No service provided'});
    }

    services.push({serviceName: service});
    services[services.length - 1].datacenters = [];

    if (datacenters && addresses) {
        for(var i = 0; i < datacenters.length; i++) {
            var datacenterObj = {
                "name": datacenters[i],
                "connectorNode": addresses[i],
                "hosts":[],
                "racks":[]
            };
            services[services.length - 1].datacenters.push(datacenterObj);
        }
    }
    return cb(null, services, {status: 'Successfully added'});
}

function editService(req, res, services, cb) {
    // Fix editing every record
    services = JSON.parse(services);
    log("Enter service controller - edit");
    if (doesServiceExist()) {
        return res.send({status: 'Cannot change name to an already existing service'});
    }
    if(req.body.service) {
        for(var key in services) {
            console.log(services[key].serviceName);
            if(services[key].serviceName === req.body.oldService) {
              services[key].serviceName = req.body.service;
            }
        }
    }
    cb(req, res, services);

    function doesServiceExist() {
        console.log('Checking if the service exists');
        if (req.body.service) {
            for (var key in services) {
                if (services[key].serviceName.toLowerCase() === req.body.service.toLowerCase()) {
                    console.log('This service already exists');
                    return true;
                }
            }
            return false;
        }
        return false;
    }
}

function deleteService(req, res, services, cb) {
    services = JSON.parse(services);
    log('Enter service controller - delete');
    services = services.filter(function(service) {
        return service.serviceName !== req.body.serviceName;
    });
    return cb(null, services, {message: "Successfully deleted service"});
}

module.exports = {
    readServices: readServices,
    writeServices: writeServices,
    editService: editService,
    deleteService: deleteService
};