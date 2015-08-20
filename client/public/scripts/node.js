var tooltipString = "Hello";
var serviceName;
var datacenter;
var hostAdd;
var ipAddress;

var graphData = [];

var xScale; 
var yScale;
var xAxis;
var yAxis;

var style = {
  whiteContent: {
    display: 'none',
    position: 'absolute',
    top: '25%',
    left: '25%',
    width: '50%',
    height: '50%',
    padding: '16px',
    border: '16px solid orange',
    backgroundColor: 'white',
    zIndex: '1002',
    overflow: 'auto'
  }
}

function goToClusters() {
    document.location.href = "/service/" + serviceName;
}
function goToDatacenters() {
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter;  
}
function goToHosts() {
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + hostAdd
}

function goToNode() {
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + hostAdd +"/ip/"+this.props.address;  
}

function drawClusterHistoryGraph(data) {
    //format for hard-coding test data
    //var data = [{"date":"2012-03-20","total":3},{"date":"2012-03-21","total":2},{"date":"2012-03-22","total":2},{"date":"2012-03-23","total":1},{"date":"2012-03-24","total":3},{"date":"2012-03-25","total":2},{"date":"2012-03-26","total":1}];
    function getStatus(d) {
        switch (d) {
          case 1: return 'healthy';
          break;
          case 2: return 'suspect'; 
          break;
          case 3: return 'faulty';
          break;
        }
    }

    var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse;

    data.forEach(function(d) {
        d.date = parseDate(d.date);
    });

    var margin = {top: 40, right: 40, bottom: 40, left:40},
      width = 600,
      height = 500;

    xScale = d3.time.scale()
      .domain([new Date(data[0].date), new Date(Date.now())])
      .rangeRound([0, width - margin.left - margin.right]);

    yScale = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.total; })])
      .range([height - margin.top - margin.bottom, 0]);

    xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')

    yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .tickPadding(8);

    var svg = d3.select('.graph').append('svg')
      .attr('class', 'chart')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    d3.select("body") 
    .append('div')
    .attr('class', 'tooltipd3');

    var tooltip = d3.select('.tooltipd3');

    tooltip.append('div')
      .attr('class', 'label');

    tooltip.append('div')
     .attr('class', 'percent');

    var charts = svg.selectAll('.chart')
      .data(data)
    .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', function(d) { return xScale(new Date(d.date)); })
      .attr('y', function(d) { return 0; })
      .attr('width',15)
      .attr('height', function(d) { return height - margin.top - margin.bottom; })
      .style("fill", function(d) { 
          if (d.total == 3) { 
            return 'red';
          } else if (d.total == 2) { 
            return 'yellow';
          } else { return 'green'}
      });

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
      .call(xAxis);

    charts.on('mouseover', function(d) {
       tooltip.select('.label').html(""+d.date);
       tooltip.select('.percent').html(getStatus(d.total));
       tooltip.style('display', 'block');
    });

    charts.on('mouseout', function() {
      tooltip.style('display', 'none');
    });

    charts.on('mousemove', function(d) {
      var coordinates = [0, 0];
      coordinates = d3.mouse(this);
      var x = coordinates[0];
      var y = coordinates[1];

      var wWidth = window.innerWidth;
      var wHeight = window.innerHeight;

      tooltip.style('top', (y+200) + 'px')
        .style('left', (x+10 + wWidth/5 + 'px'));
    });
}

function UpdateClusterHistoryGraph(data) {
      function getStatus(d) {
        switch (d) {
          case 1: return 'healthy';
          break;
          case 2: return 'suspect'; 
          break;
          case 3: return 'faulty';
          break;
        }
      }

      var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse;

       data.forEach(function(d) {
          d.date = parseDate(d.date);
       });

      var margin = {top: 40, right: 40, bottom: 40, left:40},
        width = 600,
        height = 500;

      xScale = d3.time.scale()
          .domain([new Date(data[0].date), new Date(Date.now())])
          .rangeRound([0, width - margin.left - margin.right]);
      xAxis = d3.svg.axis()
          .scale(xScale)
          .orient('bottom')

      var svg = d3.select('.graph'); 
      svg.selectAll(".x.axis").transition().duration(1500).call(xAxis);

      svg.selectAll('.rect').remove();

      var charts = svg.selectAll('.chart')
          .data(data)
        .enter().append('rect')
          .attr('class', 'bar')
          .attr('x', function(d) { return xScale(new Date(d.date)); })
          .attr('y', function(d) { return 0; })
          .attr('width', 15)
          .attr('height', function(d) { return height - margin.top - margin.bottom; })
          .style("fill", function(d) { 
              if (d.total == 3) { 
                return 'red';
              } else if (d.total == 2) { 
                return 'yellow';
              } else { return 'green'}
          });
}

var Cluster = React.createClass({
  loadMemberHistory: function() {
    $.ajax({
      url: "/memberhistory",
      dataType: 'json',
      data: { members: [ipAddress], ip: this.props.address, datacenterName: datacenter, serviceName: serviceName},
      cache: false,
      success: function(data) {
        var membershipHistory = [];
        var memberHistoryArray = data.memberHistory;
        memberHistoryArray = memberHistoryArray.sort(function sort(a, b) {
                  if (a.history.length < b.history.length) {
                      return 1;
                  } else if (a.history.length > b.history.length) {
                      return -1;
                  } else {
                      return 0;
                  }
          });
        var dataDates = [];
        var noDataMsg = "";
        for (var i = 0; i < memberHistoryArray.length; i++) {
           var history = memberHistoryArray[i];
           var isIn = false;

           if (history.address == ipAddress) {
                if (history.history.length > 0) {
                    membershipHistory.push(history.address+" : ");
                    for (var j = 0; j < history.history.length; j++) {
                        var hist = history.history[j];
                        hist = JSON.parse(hist);
                        var timestamp = new Date(hist['timestamp']);

                        date = new Date(hist['timestamp']),
                        datevalues = [
                        date.getFullYear(),
                        date.getMonth()+1,
                        date.getDate(),
                        date.getHours(),
                        date.getMinutes(),
                        date.getSeconds(),
                        ];

                        var timeYear = date.getFullYear();
                        var timeMonth = date.getMonth()+1
                        var timeDay = date.getDate();
                        var timeHours = date.getHours();
                        var timeMinutes = date.getMinutes();
                        var timeSeconds = date.getSeconds();
                        var date2 = ""+timeDay+"-"+timeMonth+"-"+timeYear+" "+timeHours+":"+timeMinutes+":"+timeSeconds;
                        var stat; 

                        if (hist['status'] == 'alive') {
                            stat = 1;
                        } 
                        else if (hist['status'] == 'suspect') {
                            stat = 2;
                        }
                        else {
                            stat = 3;
                        }
                        var jData = {date: date2, total: stat, timestamp: timestamp};
                        dataDates.push(jData);
                        membershipHistory.push("("+timestamp+", "+hist['status']+")");
                        if(j < history.history.length-1) { 
                            membershipHistory.push(", ");
                        }
                    }
                    membershipHistory.push("\n");
                }
           }
        }
          if (this.state.graphOnce == false) {
             if (dataDates.length > 0) {
                dataDates = dataDates.sort(function sort(a, b) {
                    if (a.timestamp < b.timestamp) {
                        return -1;
                    } else if (a.timestamp > b.timestamp) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                drawClusterHistoryGraph(dataDates);
                this.setState({graphOnce: true});
             }
             else {
                noDataMsg = "No status changes found in history!";
             }
             
          } else { 
              if (dataDates.length > 0) {
                dataDates = dataDates.sort(function sort(a, b) {
                    if (a.timestamp < b.timestamp) {
                        return -1;
                    } else if (a.timestamp > b.timestamp) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                UpdateClusterHistoryGraph(dataDates);
             }
             else {
                noDataMsg = "No status changes found in history!";
             }
          }
         this.setState({membershipHistoryArray: memberHistoryArray,membershipHistory: membershipHistory, noDataMsg: noDataMsg});
      }.bind(this),
      error: function(xhr, status, err) {
        console.log('Error fetching cluster size history');
      }.bind(this)
    });
  },
  loadRingInfoFromServer: function() {
    $.ajax({
      url: "/admin/stats",
      dataType: 'json',
      data: { ip: ipAddress, datacenterName: datacenter, serviceName: serviceName},
      cache: false,
      success: function(data) {
        var blob = JSON.stringify(data);
        var timestamp = data['timestamp'];

        date = new Date(timestamp),
            datevalues = [
              date.getFullYear(),
              date.getMonth()+1,
              date.getDate(),
              date.getHours(),
              date.getMinutes(),
              date.getSeconds(),
            ];

        var timeYear = date.getFullYear();
        var timeMonth = date.getMonth()+1;
        var timeDay = date.getDate();
        var timeHours = date.getHours();
        var timeMinutes = date.getMinutes();
        var timeSeconds = date.getSeconds();
        var membership = data['membership'];
        var members = membership['members'];
        var mLength = members.length;
        var membershipList = "";
        var ipAddresses = [];
        var memberAddresses = [];
        var myIp;
        var myStatus;

        for(var i = 0; i < members.length; i++) {
          member = members[i];
          membershipList+="("+member['address']+")";
          membershipList+="\n\n\n";
          ipAddresses.push(member['address']);
          memberAddresses.push(member['address']);

          if(member['address'] == ipAddress) { 
              myIp = member['address'];
              myStatus = member['status'];
          }
        }

        var hosts = data['hosts'];
        var hostAddresses = [];

        for (var i = 0; i < hosts.length; i++) {
            var h = hosts[i];
            childNodes = h['childNodes'];
            var hAlive = 0;
            var hSuspect = 0;
            var hFaulty = 0;
            var hostData;
            var hostChildren;

            if(h['hostAddress'] == hostAdd) {
                hostData = h;
                hostChildren = childNodes;
                var membershipHistoryArray = this.state.membershipHistoryArray;
                if(membershipHistoryArray) {
                    if(hostChildren.length == membershipHistoryArray.length) {
                      for (var j = 0; j < hostChildren.length; j++) {
                          hostChildren[j].history = membershipHistoryArray.history;
                      }
                  }
                }
                mLength = hostChildren.length;

                for (var j = 0; j < childNodes.length; j++) {
                  member = childNodes[j];

                  if(member['status'] == 'alive') {
                    hAlive++;
                  }
                  else if (member['status'] == 'suspect') {
                    hSuspect++;
                  }
                  else if (member['status'] == 'faulty') {
                    hFaulty++;
                  }
                }

                var alive = 0.0;
                var suspect = 0.0;
                var faulty = 0.0;

                for(var z = 0; z < childNodes.length; z++)
                {
                    member = childNodes[z];

                    if(member['status'] == 'alive') {
                      alive++;
                    }
                    else if (member['status'] == 'suspect') {
                      suspect++;
                    }
                    else if (member['status'] == 'faulty') {
                      faulty++;
                    }
                }

                var memberLength = parseFloat(mLength.toString());
                var alivePerc = (alive / memberLength) * 100.0;
                alivePerc = alivePerc.toFixed(2);
                var suspectPerc = (suspect / memberLength) * 100.0;
                suspectPerc = suspectPerc.toFixed(2);
                var faultyPerc = (faulty / memberLength) * 100.0;
                faultyPerc = faultyPerc.toFixed(2);
                h = h['hostAddress'];
                hostAddresses.push("\t"+h+"-"+datacenter + "\t[" + hAlive + " alive,   " + hSuspect + " suspect,   " + hFaulty + " faulty]");
                hostAddresses.push("\n");
            }
        }

        if(this.state.doonce == false)
        {
            var json = {
              "name": this.props.address,
              "children" : [
              ]
            }

            for(var j = 0; j < mLength; j++)
            {
              json["children"].push({"name": members[j].address});
            }

            var me = this.getDOMNode();
        }

        this.setState({doonce: true, data: blob, mLength: mLength, alivePerc: alivePerc, suspectPerc: suspectPerc, faultyPerc: faultyPerc,
          membershipList: membershipList, timestamp: timestamp, hosts: hosts, hostAddresses: hostAddresses, alive: alive, suspect: suspect,
          faulty: faulty, timeYear: timeYear, timeMonth: timeMonth, timeDay: timeDay, timeHours: timeHours, timeMinutes: timeMinutes,
          timeSeconds: timeSeconds, hostData: hostData, hostChildren: hostChildren,memberAddresses: memberAddresses,
          myIp: myIp, myStatus: myStatus});

      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  }, 
  getInitialState: function() {
  return {graphOnce: false, data: [],doonce: false, service: this.props.serviceName, address: this.props.datacenter, rend: false};
  },
  componentDidMount: function() {
    this.loadRingInfoFromServer();
    this.loadMemberHistory();
    setInterval(this.loadRingInfoFromServer, 1000);
    setInterval(this.loadMemberHistory, 5000);
    setInterval(this.updateSelf,2000);
  },
  handleServiceClick: function() {
    // handle address to datacenter
    console.log("handleServiceClick");
    document.location.href = "/service/" + this.props.serviceName;  
  },
  handleToggleClick: function() {
     if(this.state.rend == true) {
        this.state.rend = false;
     } else {
        this.state.rend = true;
     }
  },
  changeService: function(serv, addr) {
    this.setState({service: serv, address: addr});
  },
  render: function() {
    var boxes = [];

    if (this.state.myStatus == "alive") {
        boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="green" />
      </svg>);
      
    } else if (this.state.myStatus == "suspect") {
         boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="yellow" />
      </svg>);
    } else {
        boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);
    }

    var dFetch;
    if(this.state.timeYear) {
        dFetch = "" + this.state.timeYear+"/"+this.state.timeMonth+"/"+this.state.timeDay+" "+this.state.timeHours+":"+this.state.timeMinutes+":"+this.state.timeSeconds;
    } else {
        dFetch = "Unknown, node unreachable";
    }
    
    return (
          <div>
            <i>Last data fetch: {dFetch}</i>
            <p></p>
            <div className="whitespace">
            </div>
            <p></p>
            <p></p>
            <p></p>
            {this.state.myIp} {boxes}
            <p></p>
            {this.state.noDataMsg}

          </div>
    );
  }
});

var PopUp = React.createClass({
  handleEditClick: function() {
    // Make network
    var service = this.state.service;
    var address = this.state.address;
    this.props.trigger(service, address);
    // remove div
    document.getElementById('light').style.display='none';
    document.getElementById('fade').style.display='none';
  },
  handleServiceChange: function(event) {
    this.setState({service: event.target.value});
  },
  handleAddressChange: function(event) {
    this.setState({address: event.target.value});
  },
  render: function() {
    return(
        <div id="light" style={style.whiteContent}>
           Service: <input type="text" onChange={this.handleServiceChange}/>
           Address: <input type="text" onChange={this.handleAddressChange}/>
           <button onClick={this.handleEditClick}>Edit service</button>
        </div>
      )
  }
})

var RemoveEdit = React.createClass({
  removeService: function(){
    //TODO create function for single ajax call
    $.ajax({
      url: "/service",
      dataType: 'json',
      type: 'DELETE',
      data: { serviceName: this.props.service},
      cache: false,
      success: function(data) {
        console.log(data);
        //Update UI here (POPUP - service has been offboarded);
        //Would it update automatically?
      },
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    })
  },
  // TODO: Think more about how edit should work.
  // Service and data center?
  editService: function(serv, addr) {
    console.log("Service: " + this.props);
    $.ajax({
      url: "/service",
      dataType: 'json',
      type: 'PUT',
      data: {service: serv, address: addr, oldService: this.props.service, oldAddress: this.props.address},
      cache: false,
      success: function(data) {
        console.log(data);
      },
      error: function(xhr, status, err) {
        console.log(status, err.toString());
      }
    })
  },
  handleRemoveClick: function() {
    // get reference to service and remove it.
    // remove services from list.
    console.log("handleRemoveClick");
    this.removeService();
    
  },
  handleEditClick: function() {
    document.getElementById('light').style.display='block';
    document.getElementById('fade').style.display='block';
    console.log("handleEditClick");
    console.log(this.props.address);
    console.log(this.props.service);
    <PopUp />
  },
  render: function() {
    return (
      <div className="addRemoveButtons">
        <button onClick={this.handleRemoveClick}>Remove Service</button>
        <button onClick={this.handleEditClick}>Edit Service</button>
        <PopUp trigger={this.editService} service={this.props.serviceName} address={this.props.address}/>
      </div>
    
  );
  }
})

var RingInfo = React.createClass({
  render: function() {
  return (
      <div className="ringInfo">
        <ClusterList data={this.state.data} />
      </div>
    );
  }
})

var ClusterBox = React.createClass({
  loadServicesFromServer: function() {
    console.log(this.props.url);
    console.log('Initiating network call');
    $.ajax({
      url: "../../../"+this.props.url, //services.json
      dataType: 'json',
      cache: false,
      success: function(data) {
        for (var i = 0; i < data.length; i ++) { 
            if(data[i].serviceName == serviceName) {
                this.setState({datacenters: data[i].datacenters});
            }
        }
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.log('Error retrieving service');
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: [], data2: [],datacenters: []};
  },
  componentDidMount: function() {
    // TODO: Add async here?
    console.log('Here');
    console.log(window.location.pathname.split('/'));
    serviceName = window.location.pathname.split('/')[2];
    datacenter = window.location.pathname.split('/')[4];
    hostAdd= window.location.pathname.split('/')[6];
    ipAddress = window.location.pathname.split('/')[8];
    this.loadServicesFromServer();
    setInterval(this.loadServicesFromServer, this.props.pollInterval);
  },
  render: function() {
    return (
      <div className="ClusterBox">
        <ClusterList data={this.state.datacenters} />
        {this.state.data2}
      </div>
    );
  }
});

var ClusterList = React.createClass({
  render: function() {
    var clusterNodes = this.props.data.map(function(cluster, index) {
      if (cluster.name == datacenter) {
          return (
          <Cluster clusterName={cluster.name} address={cluster.connectorNode}>
          </Cluster>
        );
        } else {
          return (<p></p>);
        }
    });
    return (
      <div className="ClusterList">
        {clusterNodes}
      </div>
    );
  }
});

React.render(
  <ClusterBox url="../../../../services.json" pollInterval={2000} />,
  document.getElementById('content')
);

