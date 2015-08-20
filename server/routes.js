'use strict';

var clusterController = require('./controllers/cluster');
var serviceController = require('./controllers/service');
var TChannel = require('tchannel');
var HashRing = require('ringpop/lib/ring.js');
var async = require('async');
var dns = require('dns');
var log = require('./util/logger');
var RedisClient = require('./util/redis_client');
var cluster = require('cluster');

var client = TChannel();

if(cluster.isWorker) {
    console.log("IS WORKER");
    var portNum = cluster.worker.id + 31880;
    client.listen(portNum, '127.0.0.1');
}
else {
    console.log("IS MASTER");
    client.listen(31879, '127.0.0.1');
}
RedisClient = new RedisClient(null, null);
RedisClient.connect();

var thisClient = RedisClient.returnClient();

var subChan;



function getClusterHistory(req, res) {
    RedisClient.readList2("" + req.query.serviceName + "-" + req.query.datacenterName, function onRead(reply) {
        var history = {
          sizeHistory: reply
        };
        res.end(JSON.stringify(history));
    });
}

function getMemberHistory(req, res) {
    log('Enter get member history');
    var members = req.query.members;
    async.waterfall([
        redisFetch,
        dnsResolution
    ], function onDataMassage(err, data) {
        if (!err) {
            res.end(JSON.stringify({memberHistory: data}));
            return;
        } else {
            log(err.message);
        }
    });

    function redisFetch(cb) {
        async.mapLimit(members, 1000, RedisClient.readList3.bind(RedisClient), function(err, result) {
            cb(null, result);
        });
    }

    function dnsResolution(data, cb) {
        data.map(function(member) {
            if (member.address) {
                var ip = member.address.split(':');
                try{
                    dns.reverse(ip[0], function(err, domains) {
                        if (!err) {
                        }
                    });
                } catch(err) {
                    return;
                }
            }
        });
        cb(null, data);
    }
}

function getAdminStatsFinishedMembership(req, res, membership, services) {  
    if (!!membership) {
      membership = JSON.parse(membership);
    } else {
      membership = {};
    }
    services = JSON.parse(services);

    if(!subChan) {
        subChan = client.makeSubChannel({
            serviceName: 'ringpop',
            peers: [req.query.ip],
            requestDefaults: {
                headers: {
                    'as': 'raw',
                    'cn': 'ringpop'
                }
            }
        });
    }

    subChan.waitForIdentified({host: req.query.ip}, function onIdentified() {
        subChan.request({hasNoParent: true, serviceName: 'ringpop', timeout: 30000}).send("/admin/stats", null, null, function (err, res3, arg2, res2) {
            if (err) {
                log('Error on tchannel client');
                log(err);
                log(req.query.ip);
                log(req.query.datacenterName);

                if(!membership[req.query.serviceName]) {
                  res.end(JSON.stringify({message: 'Not a valid adddress'}));
                  return;
                }

                if (membership[req.query.serviceName] === undefined) {
                    console.log('This cluster has no members?');
                    res.send({message: 'This cluster has no members'});
                    return;
                }

                console.log("Name of service: " + req.query.serviceName);
                console.log('Name of dc: ' + req.query.datacenterName);
                var serviceMembership = membership[req.query.serviceName];
                var members = serviceMembership[req.query.datacenterName].members;
                var newAddress;

                if(members) {
                    var allFaulty = true;
                    for (var i = 0; i < members.length; i++) {
                        if (members[i].address === req.query.ip) {
                            members[i].status = "faulty";
                        } else
                        if(members[i].status != "faulty") {
                            allFaulty = false;
                            if(services) 
                            for (var j = 0; j < services.length; j++) {
                                var serv = services[j];
                                if(serv) {
                                    if(serv.datacenters) {
                                        for (var k = 0; k < serv.datacenters.length; k++) {
                                            if(services[j].datacenters[k].connectorNode === req.query.ip) {
                                              services[j].datacenters[k].connectorNode = members[i].address;
                                              newAddress = members[i].address;
                                              i = members.length + 1;
                                              j = services.length + 1;
                                              break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (allFaulty === true) {
                        for (var i = 0; i < members.length; i++) {
                            //Start checking again at the start of the membership list,
                            //in case a node we already checked has become viable in the interim
                            members[i].status = "alive";
                        }

                        for (var j = 0; j < services.length; j++) {
                            var serv = services[j];
                            for (var k = 0; k < serv.datacenters.length; k++) {
                                if(services[j].datacenters[k].connectorNode === req.query.ip) {
                                  services[j].datacenters[k].connectorNode = members[0].address;
                                  newAddress = members[0].address;
                                }
                            }
                        }
                    }
                }
                
                var key = "services";
                RedisClient.setKV2(key,JSON.stringify(services, null, 4));
                res.send(err.message+"&"+newAddress+"&"+req.query.datacenterName);
        }
        else {
            var jsonRes = JSON.parse(res2.toString('utf8'));      
            var serviceName = req.query.serviceName;
            var datacenterName = req.query.datacenterName;

            var serverKey = {};

            serverKey[req.query.datacenterName] = jsonRes.membership;

            if (!membership[serviceName]) {
               membership[serviceName] = {};
            }

            if (!membership[serviceName][datacenterName]) {
                membership[serviceName][datacenterName] = {};
            }
            
            var serviceMembership = membership[req.query.serviceName];
            var members = serviceMembership[req.query.datacenterName].members;
            var newAddress;

            var ip = req.query.ip;
            if (members) {
                for (var i = 0; i < members.length; i++) {
                    if (members[members.length-1].address == ip) { 
                        if (services) {
                            for (var j = 0; j < services.length; j++) {
                                var serv = services[j];
                                if (serv) {
                                    if (serv.datacenters) {
                                        for (var k = 0; k < serv.datacenters.length; k++) {
                                            if (services[j].datacenters[k].connectorNode == req.query.ip) {
                                              services[j].datacenters[k].connectorNode = members[0].address;
                                              console.log("\nSwitching to next connector node in round-robin cycle: "+members[0].address);
                                              i = members.length + 1;
                                              j = services.length + 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else 
                    if (i > 0) {
                        if (members[i-1].address == ip) {
                            ip = members[i].address;
                            if (services && members[i].status != 'faulty') {
                                for (var j = 0; j < services.length; j++) {
                                    var serv = services[j];
                                    if (serv) {
                                        if (serv.datacenters) {
                                            for (var k = 0; k < serv.datacenters.length; k++) {
                                                if (services[j].datacenters[k].connectorNode == req.query.ip) {
                                                  services[j].datacenters[k].connectorNode = members[i].address;
                                                  console.log("Switching to next connector node in round-robin cycle: "+members[i].address);
                                                  i = members.length + 1;
                                                  j = services.length + 1;
                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                            }

                        }
                    } else 
                    if (members[0].address == ip) {
                        if (services && members.length > 1) {
                            for (var j = 0; j < services.length; j++) {
                                var serv = services[j];
                                if (serv) {
                                    if (serv.datacenters) {
                                        for (var k = 0; k < serv.datacenters.length; k++) {
                                            if (services[j].datacenters[k].connectorNode == req.query.ip) {
                                              services[j].datacenters[k].connectorNode = members[1].address;
                                              console.log("Switching to next connector node in round-robin cycle: "+members[1].address);
                                              i = members.length + 1;
                                              j = services.length + 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            var key = "services";
            RedisClient.setKV2(key,JSON.stringify(services, null, 4));
            

            var nodeCount = jsonRes.membership.members.length;
            membership[serviceName][datacenterName] = jsonRes.membership;
            membership[serviceName][datacenterName].nodeCount = nodeCount;
            var stats = jsonRes;

            if (stats) {
                var sortedMembers = stats.membership.members.sort(function sort(a, b) {
                    if (a.address < b.address) {
                        return -1;
                    } else if (a.address > b.address) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                var percentages = calculateHashPortions(sortedMembers);
                var hosts = calculateHosts(sortedMembers);
                var service;

                for (var i = 0; i < services.length; i++) {
                    if (services[i].serviceName === serviceName) {
                        service = services[i];
                    }
                }
                if (service) {
                    var datacenter;

                    for (var i = 0; i < service.datacenters.length; i++) {
                        if (service.datacenters[i].name === datacenterName) {
                            datacenter = service.datacenters[i];
                        }
                    }

                    if (datacenter) {
                        datacenter.hosts = hosts;
                    }
                }
            }
            var membershipObject = JSON.parse(res2);
            writeToMembership();
            async.mapLimit(membershipObject.ring, 5, dnsResolution.bind(membershipObject), function(err) {
                if (err) {
                    res.end(JSON.stringify(membershipObject));
                    return;
                }
                membershipObject.hosts = hosts;
                membershipObject.percentages = percentages;
                res.end(JSON.stringify(membershipObject));
            });
          }

          function dnsResolution(address, cb) {
                var host = address.split(':');
                dns.reverse(host[0], function(err, hostname) {
                    if (err) {
                        cb(null);
                        return;
                    }
                    if (!err) {
                        if (!membershipObject.hostnames) {
                            membershipObject.hostnames = {};
                        }
                        var cleanHostIndx = hostname[0].indexOf('.');
                        var cleanHost = hostname[0].substring(0, cleanHostIndx);
                        if (!membershipObject.hostnames[host[0]]) {
                            membershipObject.hostnames[host[0]] = cleanHost;
                        }
                        cb(null);
                        return;
                    }
                });
          }
        });
    });

    function writeToMembership() {
        var key = req.query.serviceName + ":" + req.query.datacenterName + ":membership";
        RedisClient.setKV2(key,JSON.stringify(membership, null, 4));
    }
}

function getAdminStats(req, res) {
    var key = req.query.serviceName + ":" + req.query.datacenterName; var key = req.query.serviceName + ":" + req.query.datacenterName + ":membership";
    var key2 = "services";
    RedisClient.getTwoKeysReturnBoth(req, res, key, key2, getAdminStatsFinishedMembership, thisClient);
}

function calculateHosts(members) {
    var hostsArray = [];
    
    for (var i = 0; i < members.length; i++) {
        var address = members[i].address;
        address = address.split(":");
        var contains = false;
        for (var j = 0; j < hostsArray.length; j++) {
            if(hostsArray[j].hostAddress === address[0]) {
                contains = true;
                hostsArray[j].childNodes.push({address: members[i].address, status: members[i].status});
            }
        }

        if(!contains) {
            hostsArray.push({hostAddress: address[0], childNodes: [{address: members[i].address, status: members[i].status}]});
        }
    }
    
    return hostsArray;
}

function calculateHashPortions(members) {
    var hashRing = new HashRing();
    for (var i = 0; i < members.length; i++) {
        var member = members[i];
        hashRing.addServer(member.address);
    }
    var hashCode = 0;
    var ownership = {};

    while (hashCode < 4294967295) {
        var iter = hashRing.rbtree.upperBound(hashCode);

        if (iter.val() === null) {
            break;
        }

        if (!ownership[iter.str()]) {
            ownership[iter.str()] = 0;
        }

        ownership[iter.str()] += iter.val() - hashCode;

        hashCode = iter.val() + 1;
    }

    var keyspaceSize = hashCode - 1;
    var maxOwnage = 0;
    var maxOwners = [];
    var minOwnage = 101;
    var minOwners = [];
    var rows = [];

    members.forEach(function eachMember(member) {
        var address = member.address;

        var percentageOwned = 0;

        if (ownership[address]) {
            percentageOwned = (ownership[address] * 100) / keyspaceSize;
        }

        if (percentageOwned > maxOwnage) {
            maxOwners = [];
            maxOwners.push(member.address);
            maxOwnage = percentageOwned;
        }

        if (percentageOwned < minOwnage) {
            minOwners = [];
            minOwners.push(member.address);
            minOwnage = percentageOwned;
        }

        rows.push({
            address: member.address,
            percentage: percentageOwned,
            status: member.status
        });
    });
    return rows;
}

function readServices(req, res) {
    return serviceController.readServices(req, res, RedisClient);
}

function getClusters(req, res) {
    res.render('clusters', {service: req.params.service});
}

function getDatacenter(req, res) {
    res.render('datacenter', {service: req.params.service, datacent: req.params.datacent});
}

function getHost(req, res) {
    res.render('host', {service: req.params.service, datacent: req.params.datacent, host: req.params.host});
}

function getNode(req, res) {
    res.render('node', {service: req.params.service, datacent: req.params.datacent, host: req.params.host, ip: req.params.ip});
}

function getService(req, res) {
    res.render('services', {ip:req.params.ip});
}

function getChecksums(req, res) {
    var client = new TChannel({
        host: '127.0.0.1',
        port: 31888
    });
  
    client.send({host: req.query.ip}, '/admin/stats', null, null, function(err, res1, res2) {
        if(err) {
            res.send(err.message);
        }
        var stats = JSON.parse(res2);

        function gatherStats(member, callback) {
            client.send({host: member.address}, '/admin/stats', null, null, function(err, res1, res2) {
                if(err)
                   return callback(err);
                var stats = JSON.parse(res2);
                callback(null, stats);
            });
        }

        function mapMember(member, next) {
            gatherStats(member, function(err, stats) {
                if(err) {
                    next(null, {node: {},checksum: null, members: {}});
                }
                else {
                    if(stats !== null) {
                        next(null, {
                            node: member.address,
                            checksum: stats.membership.checksum,
                            members: stats.membership.members});
                    }
                }
            });
        }

        async.mapLimit(stats.membership.members, 10, mapMember, function onComplete(err, results) {
            if (err) {
                return res.send({});
            }
            return res.send(results);
        });
    });
}

function writeCluster(req, res) {
    var key = "services";
    RedisClient.getV_CB2(req, res, key, function cb(req2, res2, services) {
        clusterController.writeCluster(req, res, services, function onWriteCluster(err, services, message) {
            log('Write cluster controller exit');
            RedisClient.setKV2(key, JSON.stringify(services, null, 4));

            if (err) {
                return res.send(err);
            }
            return res.send(message);
        })
    });
}

function writeServices(req, res) {
    log('Enter write services controller');
    var key = "services";
    RedisClient.getV_CB2(req, res, key, function cb(req2, res2, services) {
        if (!services) {
            services = [];
        }
        serviceController.writeServices(req2, res2, services, function (err, updatedServices, message) {
            services = updatedServices;
            RedisClient.setKV2(key,JSON.stringify(services));
            if (err) {
                return res.send(err);
            }
            return res.send(message);
        });
    });
}

function deleteService(req, res) {
    log('Enter delete services controller');
    var key = "services";
    RedisClient.getV_CB2(req, res, "services", cb);

    function cb(req2, res2, services) {
      serviceController.deleteService(req2, res2, services, function(err, updatedServices, message) {
          services = updatedServices;
          RedisClient.setKV2(key,JSON.stringify(services));
          if (err) {
              return res.send(err);
          } else {
              return res.send(message);
          }
      });
    }
}

function editService(req, res) {
    var key = "services";
    RedisClient.getV_CB2(req, res, key, cb);

    function cb(req2, res2, services) {
       serviceController.editService(req2, res2, services, finishedEditing);
    }

    function finishedEditing(req3, res3, services) { 
        RedisClient.setKV2(key,JSON.stringify(services));

        res3.send({message: "Success editing service"});
    }
}

function deleteCluster(req, res) {
    var key = "services";
    RedisClient.getV_CB2(req, res, key, cb);

    function cb(req2, res2, services) {
        clusterController.deleteCluster(req, res, services, finished);
    }

    function finished(req3, res3, services) {
        RedisClient.setKV2(key,JSON.stringify(services));
        res3.send({message: "Success deleting Cluster"});
    }
}

function editCluster(req, res) {
    var key = "services";
    RedisClient.getV_CB2(req, res, key, cb);

    function cb(req2, res2, services) {
       clusterController.editCluster(req2, res2, services, finished);
    }
    
    function finished(req3, res3, services) {
        RedisClient.setKV2(key,JSON.stringify(services));
        res3.send({message: "Success editing Cluster"});
    }
}

function onboard(req, res) {
    return res.render('onboard');
}

function onboardCluster(req, res) {
    return res.render('onboard_clusters', {service: req.query.service});
}

function lookup(req, res) {
    return clusterController.lookup(req, res);
}

module.exports = {
    getAdminStats: getAdminStats,
    readServices: readServices,
    writeServices: writeServices,
    getService: getService,
    getChecksums: getChecksums,
    getClusters: getClusters,
    deleteService: deleteService,
    deleteCluster: deleteCluster,
    editService: editService,
    editCluster: editCluster,
    onboard: onboard,
    onboardCluster: onboardCluster,
    writeCluster: writeCluster,
    getDatacenter: getDatacenter,
    getHost: getHost,
    getClusterHistory: getClusterHistory,
    getMemberHistory: getMemberHistory,
    getNode: getNode,
    lookup: lookup
};
