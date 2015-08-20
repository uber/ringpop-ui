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
