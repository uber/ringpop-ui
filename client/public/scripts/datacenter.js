
//Config Variables
var percVsNodesThreshold = 100; //how many nodes in a graph before we should represent it with a percent graph versus one slice for each node?
//End Config Variables

//Global Variables
var serviceName;
var datacenter;
var yAdjust = 0;
var clusterSize = 0;
var disconnected = "";
var lookupInProgress = false;
var aliveHistoryArray = [];
var suspectHistoryArray = [];
var faultyHistoryArray = [];
var aliveDrawn = false;
var suspectDrawn = false;
var faultyDrawn = false;
var style = {
    path: {
      stroke: "white",
      strokeWidth: "0.1%"
    }
}
var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var memberStatuses = {}; //Used as a dictionary of sorts for retrieving the status of a node, given the address passed in by memberStatuses[address]
//End Global Variables

function goToClusters() {
    document.location.href = "/service/" + serviceName;
}

function goToDatacenters() {
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter;  
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
      //For artificially incrementing the current time by 5 days, for testing purposes
      //curTime = curTime+3600000*5;
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

              var timeStamp = hist.timestamp;
               //only include histories in the last 24 hours
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
                              zTimeHours+=1;
                              backfillHours.push(zTimeHours)
                          }
                      }
                  }
                  
                  if (j == rDat.history.length-1) {
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
                    } else if(d.value == 2) {
                      return "yellow";
                    } else 
                      {

                          return "red";
                      }
  
                });   
            }, 1000);

          //Tooltips for each hour slot
          heatMap.append("title").text(function(d) { if(d.value != 1) { return d.date; } });
}

function updateClusterHistoryGraph(data) {
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 1060 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse;
    data.forEach(function(d) {
        d.date = parseDate(d.date);
        d.close = +d.close;
      });
    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.close); });

    var svg = d3.select("#clusterHistory");

    x.domain([new Date(data[0].date), new Date(Date.now())]);
    y.domain([0, d3.max(data, function(d) { return d.close; })]);

    svg.selectAll(".x.axis").transition().duration(1500).call(xAxis);
    svg.selectAll(".y.axis").transition().duration(1500).call(yAxis);
    svg.selectAll('path').datum(data)
          .attr("class", "area")
          .attr("d", area);
}

function drawClusterHistoryGraph(data) {
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 1060 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.close); });

    var svg = d3.select("#clusterHistory").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      data.forEach(function(d) {
        d.date = parseDate(d.date);
        d.close = +d.close;
      });

      x.domain([new Date(data[0].date), new Date(data[data.length - 1].date)]);
      y.domain([0, d3.max(data, function(d) { return d.close; })]);

      svg.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("y", 6)
          .attr("dy", ".71em")
          .attr("x", 80)
          .style("text-anchor", "end")
          .text("Node Count");
}
var Node = React.createClass({
  handleNodeClick: function() {
    // handle address to datacenter
    var myHost = this.props.address;
    myHost = myHost.split(':')[0];

    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + myHost + "/ip/" + this.props.address;  
  },
  render: function() {
    var boxes = [];
    var status = [];

    switch (this.props.status) {
        case 1: 
            status.push(<svg width="25" height="25">
                <rect x="0" y="0" width="20" height="25" fill="green" />
              </svg>);
        break;

        case 2:
            status.push(<svg width="25" height="25">
                <rect x="0" y="0" width="20" height="25" fill="yellow" />
              </svg>);
        break;

        case 3:
            status.push(<svg width="25" height="25">
                <rect x="0" y="0" width="20" height="25" fill="red" />
              </svg>);
        break;
    }

    if(this.props.history) {
        for (var i = this.props.history.length-2; i > 0; i--) {
           var iHist = this.props.history[i];
           iHist = JSON.parse(iHist);

           if (Date.now() - iHist['timestamp'] <= 86400000) {
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
        }

        if (boxes.length < 1) { 
            boxes = "(No history)";
        }
    }
    return (
          <div onClick={this.handleNodeClick}>
             {status}<a href="#" onClick={this.handleHostClick}>{this.props.address}</a> {boxes}
          </div>
    );
  }
});
var Host = React.createClass({
  handleHostClick: function() {
    // handle address to datacenter
    document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + this.props.address;  
  },
  render: function() {
    var boxes = [];

    var mLength = this.props.alive+this.props.suspect+this.props.faulty;
    var memberLength = parseFloat(mLength.toString());

    var alivePerc = (this.props.alive / memberLength) * 40.0;
    alivePerc = alivePerc.toFixed(2);
    var suspectPerc = (this.props.suspect / memberLength) * 40.0;
    suspectPerc = suspectPerc.toFixed(2);
    var faultyPerc = (this.props.faulty / memberLength) * 40.0;
    faultyPerc = faultyPerc.toFixed(2);
    var count = 0;
    for(var i =0; i < Math.floor(suspectPerc) / 10; i++)
    {
      boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="yellow" />
      </svg>);

      count+=1;
    }
    for(var i =0; i < Math.floor(faultyPerc) / 10; i++)
    {
      boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="red" />
      </svg>);

      count+=1;
    }

    while(count < 4)
    {
      boxes.push(<svg width="25" height="25">
        <rect x="0" y="0" width="20" height="25" fill="green" />
      </svg>);

      count+=1;
    }

    if (this.props.hostname) {
      return (

          <div onClick={this.handleHostClick}>
              <a href="#" onClick={this.handleHostClick}><div className="inLine2" style={{width: '150px'}}>({memberLength}) {this.props.hostname}</div></a>  {boxes}
          </div>
      );
    }
    else {
      return (
          <div onClick={this.handleHostClick}>
              <a href="#" onClick={this.handleHostClick}><div className="inLine2" style={{width: '120px'}}>({memberLength}) {this.props.address}</div></a>  {boxes}
          </div>
      );
    }
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

        var memberHistoryArray = data.memberHistory;
        this.setState({membershipHistoryArray: memberHistoryArray});
        aliveHistoryArray = [];
        suspectHistoryArray = [];
        faultyHistoryArray = [];
        for (var i = 0; i < memberHistoryArray.length; i++) {
          var instance = memberHistoryArray[i];

           if(instance.history) {
                  var stat = memberStatuses[instance.address];
                  if(stat == "alive") {
                      aliveHistoryArray.push(instance);
                  } else if( stat== "suspect") {
                      suspectHistoryArray.push(instance);
                  } else  {
                      faultyHistoryArray.push(instance);
                  }

                  aliveHistoryArray = aliveHistoryArray.sort(function sort(a, b) {
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
                });
           }
      }

        setTimeout(this.loadMemberHistory, 5000 + (50*clusterSize));
      }.bind(this),
      error: function(xhr, status, err) {
        setTimeout(this.loadMemberHistory, 10000);
      }.bind(this)
    });
  },
  loadClusterSizeHistory: function() {
    var dataDates = [];
    $.ajax({
      url: "/clusterhistory",
      dataType: 'json',
      data: { ip: this.props.address, datacenterName: datacenter, serviceName: serviceName},
      cache: false,
      success: function(data) {
        var sizeHistoryArray = data.sizeHistory;
        var sizeHistoryDisplay = [];

        var largestIndex = -1;
        var sizes = [];
        var clusterHistorySizes = [];
        
        for (var i = 0; i < sizeHistoryArray.length; i++) {
            var size = JSON.parse(sizeHistoryArray[i]);
            sizeCount = size['size'];
            var timestamp = size['timestamp'];

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

            var date2 = ""+timeDay+"-"+timeMonth+"-"+timeYear+" "+timeHours+":"+timeMinutes+":"+timeSeconds;

            var jData = {date: date2, close: size.size, timestamp: timestamp};
            dataDates.push(jData);


            if(largestIndex > -1) {
              if(sizeCount > JSON.parse(sizeHistoryArray[largestIndex]).size) {
                 largestIndex = i;
                  largest = size.size;
              }
            } else {
              largestIndex = i;
              largest = sizeCount;
            }

            sizes.push(sizeCount);
            clusterHistorySizes.push(sizeCount);

            sizeHistoryDisplay.push("Timestamp: "+date+" , Size: "+sizeCount+"\n\n");
        }

        for (var i = 0; i < sizes.length; i++) {
            if(i == largestIndex) { 
               sizes[i] = 40.0;
            }
            else { 
                sizes[i] = Math.floor(40.0 * (sizes[i] / largest)); 
            }
        }
        if(this.state.clusterGraphOnce == false) {
            dataDates = dataDates.sort(function sort(a, b) {
                    if (a.timestamp < b.timestamp) {
                        return -1;
                    } else if (a.timestamp > b.timestamp) {
                        return 1;
                    } else {
                        return 0;
                    }
            });

            
            var date = new Date(Date.now());
            var timeYear = date.getFullYear();
            var timeMonth = date.getMonth()+1;
            var timeDay = date.getDate();
            var timeHours = date.getHours();
            var timeMinutes = date.getMinutes();
            var timeSeconds = date.getSeconds();
            var date2 = ""+timeDay+"-"+timeMonth+"-"+timeYear+" "+timeHours+":"+timeMinutes+":"+timeSeconds;

            dataDates.push({date: date2, close: dataDates[dataDates.length-1].close});
            drawClusterHistoryGraph(dataDates);
        }
        
        cHistoryLength = sizes.length;

        setTimeout(this.loadClusterSizeHistory, 5000 + (50 * clusterSize));

        this.setState({clusterGraphOnce: true, sizeHistory: sizeHistoryDisplay, clusterHistorySizes: clusterHistorySizes, scaledClusterHistorySizes: sizes, 
          clusterHistoryLength: cHistoryLength});
      }.bind(this),
      error: function(xhr, status, err) {
        setTimeout(this.loadClusterSizeHistory, 10000);
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

        var tchannelVersion = data['tchannelVersion'];
        var ringpopVersion = data['version'];

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

        var alive = 0.0;
        var suspect = 0.0;
        var faulty = 0.0;

        var aliveMembers = [];
        var suspectMembers = [];
        var faultyMembers = [];
        var membershipHistoryArray = this.state.membershipHistoryArray;
        for(var i = 0; i < members.length; i++)
        {
            member = members[i];
            var membHistory;
            if(membershipHistoryArray) {
                  for (var z = 0; z < membershipHistoryArray.length; z++) {
                    if(member['address'] == membershipHistoryArray[z].address) {
                      membHistory = membershipHistoryArray[z].history;

                      newMembHistory = [];
                      for ( var o = 0; o < membHistory.length; o++) {
                        var mHist = JSON.parse(membHistory[o]);
                        if (Date.now() - mHist['timestamp'] <= 86400000) {
                            var myDate = new Date(mHist.timestamp);

                            mHist['date'] = ""+myDate.getMonth()+"/"+myDate.getDate()+"/"+myDate.getFullYear()+" "+myDate.getHours()+":"+myDate.getMinutes()+":"+myDate.getSeconds();
                            membHistory[o] = JSON.stringify(mHist);
                            newMembHistory.push(membHistory[o]);
                        } 
                      }
                      membHistory = newMembHistory;
                  }
              }
           }
            memberStatuses[member['address']] = member['status'];
            if(member['status'] == 'alive') {
              alive++;
              var aliveJSON = {address: member['address'], history: membHistory, status: 1};
              aliveMembers.push(aliveJSON);
            }
            else if (member['status'] == 'suspect') {
              suspect++;
              var suspectJSON = {address: member['address'], history: membHistory, status: 2};
              suspectMembers.push(suspectJSON);
            }
            else if (member['status'] == 'faulty') {
              faulty++;
              var faultyJSON = {address: member['address'], history: membHistory, status: 3};
              faultyMembers.push(faultyJSON);
            }
        }

        aliveMembers = aliveMembers.sort(function sort(a, b) {
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
        });

        suspectMembers = suspectMembers.sort(function sort(a, b) {
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
        });

        faultyMembers = faultyMembers.sort(function sort(a, b) {
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
        });

        var memberLength = parseFloat(members.length.toString());
        var alivePerc = (alive / memberLength) * 100.0;
        alivePerc = alivePerc.toFixed(2);
        var suspectPerc = (suspect / memberLength) * 100.0;
        suspectPerc = suspectPerc.toFixed(2);
        var faultyPerc = (faulty / memberLength) * 100.0;
        faultyPerc = faultyPerc.toFixed(2);

        var mLength = members.length;

        var membershipList = "";
        var ipAddresses = [];
        var memberAddresses = [];

        for(var i = 0; i < members.length; i++) {
          member = members[i];
          memberAddresses.push(member.address);
          membershipList+="("+member['address']+")";
          membershipList+="\n\n\n";
          ipAddresses.push(member['address']);
        }

        var hosts = data['hosts'];
        var hostAddresses = [];
        var myHosts = [];

        for (var i = 0; i < hosts.length; i++) {
            var h = hosts[i];
            childNodes = h['childNodes'];

            var hAlive = 0; 
            var hSuspect = 0;
            var hFaulty = 0;

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
            if (data['hostnames']) {
              myHosts.push({hostname: data['hostnames'][h['hostAddress']], address: h['hostAddress'], alive: hAlive, suspect: hSuspect, faulty: hFaulty});
            }

            else {
              myHosts.push({address: h['hostAddress'], alive: hAlive, suspect: hSuspect, faulty: hFaulty});
            }

            h = h['hostAddress'];
            hostAddresses.push("\t"+h+"-"+datacenter + "\t[" + hAlive + " alive,   " + hSuspect + " suspect,   " + hFaulty + " faulty]");
            hostAddresses.push("\n");            
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

            if(members.length > percVsNodesThreshold-1) {
               this.drawPercRing(alivePerc, suspectPerc, faultyPerc);
            } else {
               this.drawRing(blob);
            }
        }
        else {
            if (members.length > percVsNodesThreshold-1) {

            } else {
                this.updateRing(blob);
            }
            
        }

        if(this.state.myHosts) {

            var hostDoms = this.state.myHosts.map(function(host, index) {
                return (
                  <Host hostname={host.hostname} address={host.address} alive={host.alive} suspect={host.suspect} faulty={host.faulty}>
                  </Host>
                );
              });
        } 

        clusterSize = mLength;

        if (clusterSize > 499) {
          style = {
              path: {
                      stroke: "green",
                      strokeWidth: "0.01%"
                  }
          }
        } else if (clusterSize > 399) {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.2%"
                  }
          }
        } else if (clusterSize > 299) {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.4%"
                  }
          }
        } else if (clusterSize > 199) {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.6%"
                  }
          }
        } else if (clusterSize > 99) {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.1%"
                  }
          }
        } else if (clusterSize > 50) {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.3%"
                  }
          }
        } else {
          style = {
              path: {
                      stroke: "white",
                      strokeWidth: "0.5%"
                  }
          }
        }

        disconnected = "";

        setTimeout(this.loadRingInfoFromServer, 1000 + (10 * clusterSize));

        this.setState({doonce: true, data: blob, mLength: mLength, alivePerc: alivePerc, suspectPerc: suspectPerc, faultyPerc: faultyPerc,
          memberAddresses: memberAddresses, membershipList: membershipList, timestamp: timestamp, hosts: hosts, hostAddresses: hostAddresses, alive: alive, suspect: suspect,
          faulty: faulty, timeYear: timeYear, timeMonth: timeMonth, timeDay: timeDay, timeHours: timeHours, timeMinutes: timeMinutes,
          timeSeconds: timeSeconds, myHosts: myHosts, hostDoms: hostDoms, tchannelVersion: tchannelVersion, ringpopVersion: ringpopVersion,
          aliveMembers: aliveMembers, suspectMembers: suspectMembers, faultyMembers: faultyMembers});

      }.bind(this),
      error: function(xhr, status, err) {
        disconnected = "Disconnected! Retrying...";
        setTimeout(this.loadRingInfoFromServer, 5000);
      }.bind(this)
    });
  }, 
  getInitialState: function() {
  return {clusterGraphOnce: false, data: [],doonce: false, drawBatchedGraphOnce: false, service: this.props.serviceName, address: this.props.datacenter, rend: false, 
    rend2: true, rend3: false, showAlive: false, showSuspect: false, showFaulty: false};
  },
  componentDidMount: function() {
    this.loadRingInfoFromServer();
    this.loadClusterSizeHistory();
    setTimeout(this.loadClusterSizeHistory, 1500);
    setTimeout(this.loadRingInfoFromServer, 1000);
    setTimeout(this.loadMemberHistory, 1500);
  },
  handleAliveClick: function() {
    if (this.state.showAlive == true) {
        this.setState({showAlive: false});
        document.getElementById("chart").style.display = "none";
    } else {
        if(aliveHistoryArray.length < 1) 
            return;
        this.setState({showAlive: true});
        document.getElementById("chart").style.display = "block";
        document.getElementById("chart").innerHTML = "<br/><br/>";
       // if(!aliveDrawn) {
            drawBatchedHistoryGraph(aliveHistoryArray,"#chart");
           // aliveDrawn = true;
     //  }
    }
  },
  handleSuspectClick: function() {

    if (this.state.showSuspect == true) {
        this.setState({showSuspect: false});
        document.getElementById("chart2").style.display = "none";
    } else {
        if(suspectHistoryArray.length < 1) 
            return;
        this.setState({showSuspect: true});
        document.getElementById("chart2").style.display = "block";
        if(!suspectDrawn) {
            drawBatchedHistoryGraph(suspectHistoryArray,"#chart2");
            suspectDrawn = true;
        }
    }
  },
  handleFaultyClick: function() {

    if (this.state.showFaulty == true) {
       this.setState({showFaulty: false});
        document.getElementById("chart3").style.display = "none";
    } else {
          if(faultyHistoryArray.length < 1) 
              return;
         this.setState({showFaulty: true});
         document.getElementById("chart3").style.display = "block";

        if(!faultyDrawn) {
            drawBatchedHistoryGraph(faultyHistoryArray,"#chart3");
            faultyDrawn = true;
        }
    }
  },
  handleToggleClick: function() {
     if(this.state.rend == true) {
        this.state.rend = false;
        
        if(this.state.rend2) {
            yAdjust = 500;
        } else { 
            yAdjust = 0;
        }
     } else {
        this.state.rend = true;
        if(this.state.rend2) {
            yAdjust = 550;
        } else { 
            yAdjust = 50;
        }
     }
  },
  handleToggleClick2: function() {
     if(this.state.rend2 == true) {
        this.state.rend2 = false;
        document.getElementById("clusterHistory").style.display = "none";
         if(this.state.rend) {
            yAdjust = 50;
        } else { 
            yAdjust = 0;
        }
     } else {
        this.state.rend2 = true;
        if(this.state.rend2) {
            yAdjust = 550;
        } else { 
            yAdjust = 500;
        }
        document.getElementById("clusterHistory").style.display = "block";
     }
  },
  changeService: function(serv, addr) {
    this.setState({service: serv, address: addr});
  },
  updateRing: function(blob) {

      if (lookupInProgress == false) {
          var parsedData = JSON.parse(blob);
          var dataset = [];
       
          var perc = parsedData.percentages;

          var width = 400,
          height = 600,
          radius = Math.min(width, height) / 2;

          var arc = d3.svg.arc()
            .innerRadius(radius - 100)
            .outerRadius(radius - 20);

         var pie = d3.layout.pie()
            .value(function(d) { return d.percent; })
            .sort(null);

          for(var j = 0; j < perc.length; j++)
          {
               var percentStr = "";
               percentStr += "" + perc[j].percentage + "%";
               var zson = {label: perc[j].address, percent: perc[j].percentage, status: perc[j].status};
               dataset.push(zson);
          }
          var svg = d3.select("#svg");
          svg.datum(dataset).selectAll("path")
            .data(pie)
            .attr("fill", function(d, i) { 
                if (d.data.status == 'alive') { return 'green';}
                if (d.data.status == 'suspect') { return 'yellow'}
                if (d.data.status == 'faulty') { return 'red'}
                  return 'red';
            })
      }
  },
  drawRing: function(blob) {
    var domNode = "#ring";
    var parsedData = JSON.parse(blob);

    var perc = parsedData.percentages;

    var dataset = [];

    for(var j = 0; j < perc.length; j++)
    {
         var percentStr = "";
         percentStr += "" + perc[j].percentage + "%";
         var zson = {label: perc[j].address, percent: perc[j].percentage, status: perc[j].status};
         dataset.push(zson);
    }

    var tooltip = d3.select("#wrapperInfo") 
      .append('div')
      .attr('class', 'tooltipd3');

    tooltip.append('div')
        .attr('class', 'label');

    tooltip.append('div')
       .attr('class', 'percent');

    var width = 400,
        height = 600,
        radius = Math.min(width, height) / 2;

    var id="svg";

    var color = d3.scale.category20();

    var pie = d3.layout.pie()
        .value(function(d) { return d.percent; })
        .sort(null);

    var arc = d3.svg.arc()
        .innerRadius(radius - 100)
        .outerRadius(radius - 20);

    var svg = d3.select(domNode).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", id)
        .append("g")
          .call(d3.behavior.zoom().scaleExtent([1, 1]).on("zoom", zoom))
          .attr("transform", "translate(" + width / 1.9 + "," + height / 3 + ")");

      function zoom() {
          //svg.attr("transform", "translate(" + width / 1.7 + "," + height / 2 + ")scale(" + d3.event.scale + ")");
      }

      svg.append('text')
         .attr('text-anchor', 'middle')
         .text('Cluster Health');

      var path = svg.datum(dataset).selectAll("path")
        .data(pie)
        .enter().append("path")
        .attr("fill", function(d) {
            if (d.data.status == 'alive') { return 'green';} 
            else if (d.data.status == 'suspect') { return 'yellow';}
            else { return 'red'}
        })
        .attr("d", arc)
        .on('click', function(d,i){ 
          var thisHost = d.data.label;
          thisHost = thisHost.split(':')[0];
          document.location.href = "/service/" + serviceName + "/datacenter/" + datacenter + "/host/" + thisHost +"/ip/"+d.data.label;
        });

      path.on('mouseover', function(d) {
        tooltip.select('.label').html(d.data.label);
        //tooltip.select('.count').html("Range: "+d.data.startHash+"-"+ d.data.endHash);
        tooltip.select('.percent').html(d.data.percent + "%");
        tooltip.style('display', 'block');
      });

      path.on('mouseout', function() {
        tooltip.style('display', 'none');
      });

      path.on('mousemove', function(d) {
        var coordinates = [0, 0];
        coordinates = d3.mouse(this);
        var x = coordinates[0];
        var y = coordinates[1];

        tooltip.style('top', (y+50) + 'px')
        .style('left', (x+825) + 'px');

      });

      function change() {
        var value = this.value;
        pie.value(function(d) { return d[value]; });
        path = path.data(pie);
      }

      document.getElementById("ring").style = style.path;
  },
  drawPercRing: function(alivePerc, suspectPerc, faultyPerc) {
    var domNode = "#ring";
    var dataset = [];

    var zson = {label: "", percent: alivePerc, status: 'alive'};
    dataset.push(zson);

    zson = {label: "", percent: suspectPerc, status: 'suspect'};
    dataset.push(zson);

    zson = {label: "", percent: faultyPerc, status: 'faulty'};
    dataset.push(zson);

    var tooltip = d3.select("#wrapperInfo") 
      .append('div')
      .attr('class', 'tooltipd3');

    tooltip.append('div')
        .attr('class', 'label');

    tooltip.append('div')
       .attr('class', 'percent');

    var width = 400,
        height = 600,
        radius = Math.min(width, height) / 2;

    var id="svg";

    var color = d3.scale.category20();

    var pie = d3.layout.pie()
        .value(function(d) { return d.percent; })
        .sort(null);

    var arc = d3.svg.arc()
        .innerRadius(radius - 100)
        .outerRadius(radius - 20);

    function zoom() {}

    var svg = d3.select(domNode).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", id)
        .append("g")
          .call(d3.behavior.zoom().scaleExtent([1, 1]).on("zoom", zoom))
          .attr("transform", "translate(" + width / 1.9 + "," + height / 3 + ")");

      svg.append('text')
         .attr('text-anchor', 'middle')
         .text('Cluster Health');

      var path = svg.datum(dataset).selectAll("path")
        .data(pie)
        .enter().append("path")
        .attr("fill", function(d) {
            if (d.data.status == 'alive') { return 'green';} 
            else if (d.data.status == 'suspect') { return 'yellow';}
            else { return 'red'}
        })
        .attr("d", arc);


      path.on('mouseover', function(d) {
        tooltip.select('.label').html(d.data.label);
        tooltip.select('.percent').html(d.data.percent + "%");
        tooltip.style('display', 'block');
      });

      path.on('mouseout', function() {
        tooltip.style('display', 'none');
      });

      path.on('mousemove', function(d) {
        var coordinates = [0, 0];
        coordinates = d3.mouse(this);
        var x = coordinates[0];
        var y = coordinates[1];

        tooltip.style('top', (y+50) + 'px')
        .style('left', (x+975) + 'px');

      });

      function change() {
        var value = this.value;
        pie.value(function(d) { return d[value]; });
        path = path.data(pie);
      }

      document.getElementById("ring").style = style.path;
  },
  render: function() {
    
    var circles = [];
    var count = 0;

    var sizeHistoryRectangles = [];

    for (var i = 0; i < this.state.clusterHistoryLength; i++) {
        var si = this.state.scaledClusterHistorySizes[i];
        var val = si+"";
        var half = (si/2)+"";
        var txt = this.state.clusterHistorySizes[i];
        sizeHistoryRectangles.push(<svg width="40" height={val}>
          <rect x="0" y="0" width="40" height={val} fill="grey" />
          <text x="5" y={half} font-family="sans-serif" font-size="10px" fill="black">{txt}</text>
        </svg>);
    }

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
    var hostDoms = "";
    if (this.state.rend) {
        hostDoms = this.state.hostDoms;
    }

    return (
            <div className="wrapperInfo" id="wrapperInfo">
            <div className ="row">
              <div className="col-md-4">
                <p></p>
                <i>Last data fetch: {this.state.timeYear}/{this.state.timeMonth}/{this.state.timeDay} {this.state.timeHours}:{this.state.timeMinutes}:{this.state.timeSeconds}
                <p></p><span className="redText">{disconnected}</span>
                <p></p>Connected Node: {this.props.address}
                <p></p>
                TChannel version: {this.state.tchannelVersion}, Ringpop version: {this.state.ringpopVersion}
                </i>
                <p></p>
                {this.state.mLength} nodes
                <p></p>
                  <div className="breadcrumb" onClick={this.handleAliveClick}>{greenRectangle} {this.state.alive} alive</div>
                  <div className="whitespace"></div>
                  <div style={style.chart} id="chart">
                  </div>
                <p></p>
                  <div className="breadcrumb" onClick={this.handleSuspectClick}>{yellowRectangle} {this.state.suspect} suspect</div>
                   <div className="whitespace"></div>
                   <div id="chart2"></div>
                <p></p>
                  <div className="breadcrumb" onClick={this.handleFaultyClick}>{redRectangle} {this.state.faulty} faulty</div>
                   <div className="whitespace"></div>
                   <div id="chart3"></div>
                <p></p>
                
                    <div className="inLine2" onClick={this.handleToggleClick}><button type="button" className="btn btn-default btn-lg">Hosts</button></div>
          
                <div className="whitespace">
                    {hostDoms}
                </div>
                <p></p>
                      <div className="inLine2" onClick={this.handleToggleClick2}><button type="button" className="btn btn-default btn-lg">Cluster Size History</button></div> 
                      <div className="graph2"> </div>
                       <p></p>
                <div className="row" id="clusterHistory"></div>
              </div>

              <div className="col-xs-1"></div>
              <div className="col-md-3" id="ring">
              </div>
              <div className="col-xs-1"></div>
              <div className="col-md-3">
                  <div className="col-md-8" id="ringo" style={style.path}>
                    <Lookup address={this.props.address}/>
                  </div>
                  <div className="col-md-4" id="tableLookup">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th><a id="tableAddress" href="#"></a></th>
                          <th id="tableStatus"></th>
                        </tr>
                      </tbody>
                    </table>
                  </div>
              </div>
              
          </div>
        </div>
    );
 
  }
});

var Lookup = React.createClass({
    renderTable: function(address, status) {
        console.log("Address: "+address);
        console.log("Status: "+status);
        var url = window.location.href;
        var host = address.split(':')[0];
        document.getElementById('tableAddress').innerHTML = address;
        document.getElementById('tableStatus').innerHTML = status;
        url = url + '/host/' + host + '/ip/' + address;
        document.getElementById('tableAddress').href=url;

    },
    showRing: function(address) {
        var self = this;

        var stat = memberStatuses[address];
        self.renderTable(address, stat);


        if(clusterSize < percVsNodesThreshold) {
            lookupInProgress = true;
            var svg = d3.select("#svg");
            var sections = svg.selectAll('path');
            sections.attr('fill', function(d) {
                  if (address === d.data.label) {
                      return 'orange';
                  }
            });
            setTimeout(function() {
                lookupInProgress = false;
                sections.attr('fill', function(d) {
                    if (d.data.status == 'alive') { return 'green';}
                    else if (d.data.status == 'suspect') { return 'yellow';}
                    else { return 'red'}
                });
            }, 6000);
        }


    },
    lookup: function(key, address) {
        var self = this;
        $.get("/lookup", {key: key, address: address})
          .done(function(data) {
             console.log(data);
              self.showRing(data.dest);
          })
          .fail(function() {
              alert('Error');
          });
    },
    handleSubmit: function(e) {
        e.preventDefault();
        var key = React.findDOMNode(this.refs.key).value.trim();
        if (!key) {
            return;
        }
        React.findDOMNode(this.refs.key).value = '';
        this.lookup(key, this.props.address);

    },
    render: function() {

      return (
        <form role="form" onSubmit={this.handleSubmit}>
          <h4>Key lookup</h4>
          <div className="form-group">
            <input placeholder="fake-uuid" type="text" size="25" className="form-control" id="service" ref="key" />
          </div>
          <button type="submit" className="btn btn-default" onClick={this.handleSubmit}>Search</button>
        </form>
      )
    }
})

var Ring = React.createClass({
    drawRing: function(domNode) {
      if(this.props.percentages.length === 0){
        return "Loading...";
      }
  },
  getInitialState: function() {
    return {hasRendered: false};
  },
  render: function() {
    return <div id="ring" className="ring">
             
           </div>
  }
})

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
        //Update UI here (POPUP - service has been offboarded);
        //Would it update automatically?
      },
      error: function(xhr, status, err) {
      }.bind(this)
    })
  },
  // TODO: Think more about how edit should work.
  // Service and data center?
  editService: function(serv, addr) {
    $.ajax({
      url: "/service",
      dataType: 'json',
      type: 'PUT',
      data: {service: serv, address: addr, oldService: this.props.service, oldAddress: this.props.address},
      cache: false,
      success: function(data) {

      },
      error: function(xhr, status, err) {

      }
    })
  },
  handleRemoveClick: function() {
    // get reference to service and remove it.
    // remove services from list.
    this.removeService();
    
  },
  handleEditClick: function() {
    document.getElementById('light').style.display='block';
    document.getElementById('fade').style.display='block';
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
      url: "../../"+this.props.url, //services.json
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
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: [], data2: [],datacenters: []};
  },
  componentDidMount: function() {
    serviceName = window.location.pathname.split('/')[2];
    datacenter = window.location.pathname.split('/')[4];
  
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
      if(cluster.name == datacenter){ 
          return (
            <Cluster clusterName={cluster.name} address={cluster.connectorNode}>
            </Cluster>
          );
      }
      else { 
          return;
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
