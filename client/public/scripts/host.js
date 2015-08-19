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

var tooltipString = "Hello";
var serviceName;
var datacenter;
var hostAdd; 
var clusterSize = 0;
var graphDrawn = false;

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

function drawBatchedHistoryGraph(rawData,divId) {
      if(rawData.length < 1) 
        return;

      function Hour24ToHour12(num) {
         if (num < 13) {
            return num+"AM";
         } else {
            return (num-12)+"PM";
         }
         return "";
      }

      function StatusToValue(stat) {
        if(stat == "alive") {
            return 1;
        }
        else if (stat == "suspect") {
            return 2;
        } else {
          return 3; }
      }

      var curTime = Date.now();
      var data = [];
      date = new Date(curTime),
                datevalues = [
                  date.getFullYear(),
                  date.getMonth()+1,
                  date.getDate(),
                  date.getHours(),
                  date.getMinutes(),
                  date.getSeconds(),
                ];
      var timeHours = date.getHours();
      var times = [];
      var hourConversion = {};

      for (var i = 0; i < 24; i++) {
          var adjHour = timeHours-i;

          if(adjHour < 1) {
            adjHour = 24 + adjHour;

          }
          times.push(Hour24ToHour12(adjHour));
          hourConversion[""+adjHour] = i+1; 
      }

      for(var i = 0; i < rawData.length; i++) {
          var rDat = rawData[i];
          var filledHours = [];
          var backfillHours = [];

          for(var j = rDat.history.length-1; j > -1; j--) {
              hist = rDat.history[j];
              hist = JSON.parse(hist);
              console.log("i: "+i+" :"+JSON.stringify(hist));
              var timeStamp = hist.timestamp;
              //only include histories from the last 24 hours
              if(hist['status'] != "alive" && (curTime - timeStamp) < 86400000) { 
                var diff = curTime-timeStamp;
                    date = new Date(timeStamp),
                    datevalues = [
                      date.getFullYear(),
                      date.getMonth()+1,
                      date.getDate(),
                      date.getHours(),
                      date.getMinutes(),
                      date.getSeconds(),
                    ];
                  var timeHours = date.getHours();
                  var convertedHour = hourConversion[timeHours];

                  for(var z = rDat.history.length-1; z > j; z--) {
                      zHist = rDat.history[z];
                      zHist = JSON.parse(zHist);
                      if (zHist.status == 'alive') {
                          console.log("alive");
                           var zDate = new Date(zHist.timestamp),
                            datevalues = [
                              date.getFullYear(),
                              date.getMonth()+1,
                              date.getDate(),
                              date.getHours(),
                              date.getMinutes(),
                              date.getSeconds(),
                            ];
                          var zTimeHours = zDate.getHours();
                          zTimeHours = hourConversion[zTimeHours];
                          while (zTimeHours < convertedHour) {
                              console.log("zTimeHours:" +zTimeHours);
                              zTimeHours+=1;
                              backfillHours.push(zTimeHours)
                          }
                      }
                  }
                  
                  if (j == rDat.history.length-1) {
                     console.log("j == 0");
                      var fillHour = convertedHour;
                      while (fillHour > 1) {
                          var newHour = fillHour; 
                          fillHour--;
                          data.push({day: i+1, hour: fillHour, value: 3, ip: rDat['address']});
                          filledHours.push(fillHour-1);
                      }
                  }
                  filledHours.push(convertedHour-1);
                  data.push({day: i+1, hour: convertedHour, value: StatusToValue(hist['status']), ip: rDat['address'], date: date});
              }             
          }

          for (var l = 0; l < backfillHours.length; l++) {
              data.push({day: i+1, hour: backfillHours[l], value: 3, ip: rDat['address']});
              filledHours.push(backfillHours[l]-1);
          }

          for(var p = 0; p < 24; p++) {
              var contains = false;
              for(var z = 0; z < filledHours.length; z++) {
                  if(p == filledHours[z]) {
                      contains = true;
                  }
              }
              if(!contains) {
                  data.push({day: i+1, hour: p+1, value: 1, ip: rDat['address']});
              }
          }
      }
      
      var margin = { top: 50, right: 0, bottom: 100, left: 30 },
          width = 960 - margin.left - margin.right,
          height = 100 - margin.top - margin.bottom + 40 * rawData.length,
          gridSize = Math.floor(width / 24),
          legendElementWidth = gridSize*2,
          buckets = 9,
          colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]; 

      var days = [];
      for (var i = 0; i < rawData.length; i ++) {
          days.push(rawData[i].address);
      }

          var colorScale = d3.scale.quantile()
              .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
              .range(colors);

          var svg = d3.select(divId).append("svg")
              .attr("width", width + width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var dayLabels = svg.selectAll(".dayLabel")
              .data(days)
              .enter().append("text")
                .text(function (d,i) { if(i < rawData.length) {return d;} })
                .attr("x", 150)
                .attr("y", function (d, i) { return i * gridSize; })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
                .attr("class", function (d, i) { return "dayLabel mono axis axis-workweek"; });

          var timeLabels = svg.selectAll(".timeLabel")
              .data(times)
              .enter().append("text")
                .text(function(d) { return d; })
                .attr("x", function(d, i) { return 150 + i * gridSize; })
                .attr("y", 0)
                .style("text-anchor", "middle")
                .attr("transform", "translate(" + gridSize / 2 + ", -6)")
                .on('click', function(d,i){ 
                })
                .attr("class", function(d, i) { return "timeLabel mono axis axis-worktime"; });

          var heatMap = svg.selectAll(".hour")
              .data(data)
              .enter().append("rect")
              .attr("x", function(d) { return 150 + (d.hour - 1) * gridSize; })
              .attr("y", function(d) { return (d.day - 1) * gridSize; })
              .attr("rx", 4)
              .attr("ry", 4)
              .on('click', function(d,i){ 
                var thisHost = d.ip;
                thisHost = thisHost.split(':')[0];
                document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + thisHost +"/ip/"+d.ip;
              })

              .attr("class", "hour bordered")
              .attr("width", gridSize)
              .attr("height", gridSize)
              .style("fill", colors[0]);

          heatMap.transition().duration(1000)
              .style("fill", function(d) { 
                if (d.value == 1) {
                  return "green";
                } else if(d.value == 2) {
                  return "yellow";
                } else {
                  return "orange";
                }
            });

          setInterval(function(){
              heatMap.transition().duration(1000)
              .style("fill", function(d) { 
                  if (d.value == 1) {
                      return "green";
                  } else if (d.value == 2) {
                      return "yellow";
                  } else {
                      return "red";
                  }
              });   
          }, 1000);

          heatMap.append("title").text(function(d) { return d.date; });
          graphDrawn = true;
}

var Host = React.createClass({
  handleHostClick: function() {
    // handle address to datacenter
    console.log("handleHostClick");
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + hostAdd +"/ip/"+this.props.address;  
  },
  render: function() {
    var boxes = [];
    var boxes2 = [];
    if (this.props.status == "alive") {
       boxes2.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="green" />
      </svg>);

    } else if (this.props.status == "suspect") {
         boxes2.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="yellow" />
      </svg>);
    } else {
        boxes2.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);
    }
    if(this.props.history) {
        for (var i = this.props.history.length-2; i > 0; i--) {
           var iHist = this.props.history[i];
           iHist = JSON.parse(iHist);
           var iTime = iHist['date'];
           if (boxes.length < 10) {
              if (iHist.status == "alive") {

               boxes.push(<span data-toggle="tooltip" title={iTime}><svg width="25" height="25">
                <rect x="0" y="0" width="20" height="25" fill="green" />
                
              </svg></span>);

              } else if (iHist.status == "suspect") {
                   boxes.push(<span data-toggle="tooltip" title={iTime}>
                    <svg width="25" height="25">
                  <rect x="0" y="0" width="20" height="25" fill="yellow" />
                </svg></span>);
              } else {
                  boxes.push(<span data-toggle="tooltip" title={iTime}><svg width="25" height="25">
                  <rect x="0" y="0" width="20" height="25" fill="red" />
                </svg></span>);
              }
           }
           
        }

        if (boxes.length < 1) { 
            boxes = "(No history)";
        }
    }
    
    return (
          <div className="clickable" onClick={this.handleHostClick}>
          <p></p>
         {boxes2} {this.props.address} {boxes}
          <p></p>
          <p></p>
          </div>
    );
  }
});

var Cluster = React.createClass({
  loadMemberHistory: function() {
    $.ajax({
      url: "/memberhistory",
      dataType: 'json',
      data: { members: this.state.memberAddresses, ip: this.props.address, datacenterName: datacenter, serviceName: serviceName},
      cache: false,
      success: function(data) {
        var membershipHistory = [];
        var memberHistoryArray = data.memberHistory;
        var tempArray = [];
        //Constrain to only the nodes that our current Host owns
        for (var i = 0; i < memberHistoryArray.length; i++) {
            var mHost = memberHistoryArray[i].address.split(":")[0];
            if(mHost == hostAdd) {
                tempArray.push(memberHistoryArray[i]);
            }
        }
        memberHistoryArray = tempArray;
        memberHistoryArray = memberHistoryArray.sort(function sort(a, b) {
            if (a.history.length < b.history.length) {
                return 1;
            } else if (a.history.length > b.history.length) {
                return -1;
            } else {
                return 0;
            }
        });

        for (var i = 0; i < memberHistoryArray.length; i++) {
           var history = memberHistoryArray[i];
           var isIn = false;

           if (history.history.length > 0) {
              membershipHistory.push(history.address+" : ");
              for (var j = 0; j < history.history.length; j++) {
                var hist = history.history[j];
                hist = JSON.parse(hist);
                 var timestamp = new Date(hist['timestamp']);
                  membershipHistory.push("("+timestamp+", "+hist['status']+")");
                  if(j < history.history.length-1) { 
                      membershipHistory.push(", ");
                  }
              }
              membershipHistory.push("\n");
           }
        }

        if (graphDrawn == false) {
            drawBatchedHistoryGraph(memberHistoryArray,"#graph");
        }

        this.setState({membershipHistoryArray: memberHistoryArray, membershipHistory: membershipHistory});
        //Scale time between polls to the cluster size so the system is not overloaded when polling huge populations
        setTimeout(this.loadMemberHistory, 5000 + (50 * clusterSize));
      }.bind(this),
      error: function(xhr, status, err) {
        console.log('Error fetching cluster size history');
        setTimeout(this.loadMemberHistory,10000);
      }.bind(this)
    });
  },
  loadRingInfoFromServer: function() {
    $.ajax({
      url: "/admin/stats",
      dataType: 'json',
      data: { ip: this.props.address, datacenterName: datacenter, serviceName: serviceName},
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
        for(var i = 0; i < members.length; i++) {
          member = members[i];
          membershipList+="("+member['address']+")";
          membershipList+="\n\n\n";
          ipAddresses.push(member['address']);
          memberAddresses.push(member['address']);
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
                      for (var j = 0; j < hostChildren.length; j++) {
                          for (var z = 0; z < membershipHistoryArray.length; z++) {
                              if(hostChildren[j].address == membershipHistoryArray[z].address) {
                                var membHistory = membershipHistoryArray[z].history;
                                for ( var o = 0; o < membHistory.length; o++) {
                                  var mHist = JSON.parse(membHistory[o]);
                                  var myDate = new Date(mHist.timestamp);
                                  mHist['date'] = ""+myDate.getMonth()+"/"+myDate.getDate()+"/"+myDate.getFullYear()+" "+myDate.getHours()+":"+myDate.getMinutes()+":"+myDate.getSeconds();
                                  membHistory[o] = JSON.stringify(mHist);
                                }
                                
                                hostChildren[j].history = membHistory;
                              }
                          }
                    }
                }

                hostChildren = hostChildren.sort(function sort(a, b) {
                    if (a.status == b.status) {
                       
                        if (a.history != null && b.history != null) {
                            if (a.history.length > b.history.length) {
                              return -1;
                            } else { 
                              return 1;
                            }
                            return 0;
                        } else {
                            return 0;
                        }
                      
                    } else if (a.status == 'alive') {
                        return 1;
                    } else if (b.status == 'alive') {
                        return -1;
                    } else if (a.status == 'suspect' && b.status =='faulty') {
                        return -1;
                    } else if (b.status == 'suspect' && a.status =='faulty') {
                        return 1;
                    } else {
                        return 0;
                    }

                });
                
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

        clusterSize = mLength;
        setTimeout(this.loadRingInfoFromServer, 1000 + (10 * clusterSize));
        this.setState({data: blob, mLength: mLength, alivePerc: alivePerc, suspectPerc: suspectPerc, faultyPerc: faultyPerc,
          membershipList: membershipList, timestamp: timestamp, hosts: hosts, hostAddresses: hostAddresses, alive: alive, suspect: suspect,
          faulty: faulty, timeYear: timeYear, timeMonth: timeMonth, timeDay: timeDay, timeHours: timeHours, timeMinutes: timeMinutes,
          timeSeconds: timeSeconds, hostData: hostData, hostChildren: hostChildren,memberAddresses: memberAddresses});

      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
        setTimeout(this.loadRingInfoFromServer, 5000);
      }.bind(this)
    });
  }, 
  getInitialState: function() {
  return {data: [],doonce: false, service: this.props.serviceName, address: this.props.datacenter, rend: false};
  },
  componentDidMount: function() {
    this.loadRingInfoFromServer();
    this.loadMemberHistory();
    //setInterval(this.loadRingInfoFromServer, 1000);
    setTimeout(this.loadRingInfoFromServer, 1000);
   // setInterval(this.loadMemberHistory, 5000);
    setTimeout(this.loadMemberHistory,1500);
  },
  handleServiceClick: function() {
    // handle address to datacenter
    console.log("handleServiceClick");
    document.location.href = "/service/" + this.props.serviceName;  
  },
  changeService: function(serv, addr) {
    this.setState({service: serv, address: addr});
  },
  render: function() {
    var circles = [];
    var count = 0;

    var greenRectangle = [];

     greenRectangle.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="green" />
      </svg>);

    var yellowRectangle = [];

    yellowRectangle.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="yellow" />
     </svg>);

    var redRectangle = [];

    redRectangle.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);
    
    for(var i =0; i < Math.floor(this.state.alivePerc / 10); i++)
    {
      circles.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="green" />
      </svg>);

      count+=1;
    }
    for(var i =0; i < Math.floor(this.state.suspectPerc / 10); i++)
    {
      circles.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="yellow" />
      </svg>);

      count+=1;
    }
    for(var i =0; i < Math.floor((100 - this.state.alivePerc - this.state.suspectPerc)/ 10); i++)
    {
      circles.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);

      count+=1;
    }

    while(count < 10)
    {
      circles.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);

      count+=1;
    }

    var hosts = [];
    if (this.state.hostChildren) {
            hosts = this.state.hostChildren.map(function(host, index) {
            return (
              <Host address={host.address} status={host.status} history={host.history}>
              </Host>
            )
      });
    }

    var memHistory;
    if (!this.state.membershipHistory || this.state.membershipHistory.length < 1) {
        memHistory = "No troubled nodes found";
    }
    else { 
        memHistory = this.state.membershipHistory;
    }

    return (
          <div>
            <i>Last data fetch: {this.state.timeYear}/{this.state.timeMonth}/{this.state.timeDay} {this.state.timeHours}:{this.state.timeMinutes}:{this.state.timeSeconds}</i>
            <p></p>Connected Node: {this.props.address}
            <p></p>
            {this.state.mLength} nodes
            <p></p>
             {greenRectangle} {this.state.alive} alive
            <p></p>
             {yellowRectangle} {this.state.suspect} suspect
            <p></p>
             {redRectangle} {this.state.faulty} faulty
            <p></p>  
            <p></p>
            <p></p>
            <b>Nodes</b>
            <p></p>
            <div id="graph"></div>
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
    // Remove div
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
  <ClusterBox url="../../services.json" pollInterval={2000} />,
  document.getElementById('content')
);

