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

var express = require('express');
var app = express();
var routes = require('./routes');
var path = require('path');
var hogan = require('hogan-express');
var bodyParser = require('body-parser');
var cluster = require('cluster');
var log = require('./util/logger');

if (cluster.isMaster) {
    log("       *        ");
	log("    *     *     ");
	log("  *         *   ");
	log("*             * ");
	log("  *         *   ");
	log("    *     *     ");
	log("       *        ");
	log("Ringpop UI");
	log("One ring, to rule them all\n");
    var cpuCount = require('os').cpus().length;

    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    cluster.on('exit', function() {
	    log('A worker died! Making a new one.');
	    cluster.fork();
	});
} else {
	app.set('port', (process.env.PORT || 3000));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use('/', express.static(path.join(__dirname, '../client/public')));

	app.set('views', path.join(__dirname, '../client/public'));
	app.engine('html', hogan);
	app.set('view engine', 'html');

	app.get('/service/:service', routes.getClusters);
	app.get('/service/:service/datacenter/:datacent', routes.getDatacenter);
	app.get('/service/:service/datacenter/:datacent/host/:host', routes.getHost);
	app.get('/service/:service/datacenter/:datacent/host/:host/ip/:ip', routes.getNode);
	app.get('/cluster', routes.getClusters);
	app.get('/onboard/cluster', routes.onboardCluster);
	app.get('/onboard', routes.onboard);
	app.get('/admin/stats', routes.getAdminStats);
	app.get('/services.json', routes.readServices);
	app.get('/checksums', routes.getChecksums);
	app.get('/clusterhistory', routes.getClusterHistory);
	app.get('/memberhistory', routes.getMemberHistory);
	app.get('/lookup', routes.lookup);

	app.post('/onboard/cluster', routes.writeCluster);
	app.post('/services.json', routes.writeServices);

	app.delete('/service', routes.deleteService);
	app.delete('/cluster', routes.deleteCluster);

	app.put('/service', routes.editService);
	app.put('/cluster', routes.editCluster);

	app.listen(app.get('port'), function() {
	  log('\nServer started: http://localhost:' + app.get('port') + '/');
	  log('Worker ' + cluster.worker.id + ' awaiting requests!\n');
	});
}
