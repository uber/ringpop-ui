var serviceName;

var style = {
    table: {
        border: "1px solid black",
        borderCollapse: "collapse",
        padding: '10px'
    }
}

function drawRing(id,dataset)
{
  var tooltip = d3.select(id)
      .append('div')
      .attr('class', 'tooltip');

  tooltip.append('div')
      .attr('class', 'label');

  tooltip.append('div')
     .attr('class', 'percent');

  var width = 960,
      height = 500,
      radius = Math.min(width, height) / 2;

  var color = d3.scale.category20();

  var pie = d3.layout.pie()
      .value(function(d) { return d.percent; })
      .sort(null);

  var arc = d3.svg.arc()
      .innerRadius(radius - 100)
      .outerRadius(radius - 20);

  var svg = d3.select(id).append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
        .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
        .attr("transform", "translate(" + width / 1.7 + "," + height / 2 + ")");

  function zoom() {
      svg.attr("transform", "translate(" + width / 1.7 + "," + height / 2 + ")scale(" + d3.event.scale + ")");
  }

  var path = svg.datum(dataset).selectAll("path")
    .data(pie)
    .enter().append("path")
    .attr("fill", function(d, i) { return color(i); })
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
    tooltip.style('top', (d3.event.pageY + 10) + 'px')
        .style('left', (d3.event.pageX + 10) + 'px');
  });

  function change() {
    var value = this.value;
    pie.value(function(d) { return d[value]; });
    path = path.data(pie);
    path.attr("d", arc);
  }
}


function drawGraph(id,json)
{
  var diameter = 660;
  var tree = d3.layout.tree()
      .size([360, diameter / 2 - 120])
      .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
  var diagonal = d3.svg.diagonal.radial()
      .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
  var svg = d3.select(id).append("svg")
      .attr("width", diameter)
      .attr("height", diameter)
      .append("g")
      .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

  var root = json;

  var nodes = tree.nodes(root),
  links = tree.links(nodes);

  var link = svg.selectAll(".link")
      .data(links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", diagonal);

  var node = svg.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

  node.append("circle")
      .attr("r",4.5);

  node.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
      .text(function(d) { return d.name; });

  d3.select(self.frameElement).style("height", diameter - 150 + "px");
}
var App = React.createClass({
  render: function(){
    return(
        <div>
        Hello from the app.
        <Tabs tabList={tabList} />
    </div>
    )
  }
});

var DisplayTab = React.createClass({
  render: function(){

    if(tabIndex == 1) {
        style = {
            table: {
                border: "1px solid black",
                borderCollapse: "collapse",
                padding: '10px',
                visibility: 'visible'
            }
        }
    }
    else {
        style = {
            table: {
                border: "1px solid black",
                borderCollapse: "collapse",
                padding: '10px',
                visibility: 'hidden'
            }
        }
    }
    return(<div></div>);
  }
})

var MembershipListTab = React.createClass({
  handleClick : function() {
    tabIndex = 0;
  },
  render: function(){

    if(tabIndex == 1) {
      return (
          <div className="tabum" onClick={this.handleClick}>
          Membership List
          </div>
      );
    }
    else {
      return (
          <div className="habum" onClick={this.handleClick}>
          Membership List
        </div>
      );
    }

  }
});

var PieChartGraphTab = React.createClass({
      handleClick : function() {
        tabIndex = 1;
      },
      render: function(){
          if(tabIndex == 0) {
            return (
                <div className="tabum" onClick={this.handleClick}>
                Pie Chart Graph
                </div>);
          }
          else {
            return (
                  <div className="habum" onClick={this.handleClick}>
                  Pie Chart Graph
                  </div>);
          }
      }
});


var ServiceBox = React.createClass({
  loadServicesFromServer: function() {
    console.log("Here");
    console.log(this.props.url);
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: function(data) {
        console.log("URL DATA: "+data);
        this.setState({data: data});
        this.setState({doneReading: true});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },

  handleServiceSubmit: function(service) {
    var services = this.state.data;
    services.push(service);
    this.setState({data: services}, function() {
      $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'POST',
        data: service,
        success: function(data) {
          console.log("URL DATA: "+data);
          this.setState({data: data});
          globalData = "True";
        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.props.url, status, err.toString());
        }.bind(this)
      });
    });
  },
  getInitialState: function() {
    return {data: [], data2: [], doneReading: false};
  },
  componentDidMount: function() {
    this.loadServicesFromServer();
    setInterval(this.loadServicesFromServer, this.props.pollInterval);
  },
  render: function() {
    return (
      <div className="serviceBox">
        <MembershipList data={this.state.data} url={this.props.url} rendered={this.state.doneReading} />
        {this.state.data2}
      </div>
    );
  }
});

var Members = React.createClass({
  handleServiceClick: function() {
  console.log("handleServiceClick");
  document.location.href = "/service/" + serviceName + "?ip=" + this.props.address;
  },
  render: function() {
    return(
      <tr>
        <td style={style.table} onClick={this.handleServiceClick}>{this.props.address}</td>
        <td style={style.table}>{this.props.state}</td>
        <td style={style.table}>{this.props.checksum}</td>
      </tr>
      )
  }
})

var MembershipList = React.createClass({
  getInitialState: function() {
    console.log("GeTing inital state");
    return{
      memberships: {},
      hasReadChecksums: false,
      data: [],
      doonce: true
    }
  },
  loadRingInfoFromServer: function() {
    $.ajax({
      url: "/admin/stats",
      dataType: 'json',
      data: { ip: window.location.search.slice(4)},
      cache: false,
      success: function(data) {
        var blob = JSON.stringify(data);
        var membership = data['membership'];
        var members = membership['members'];
        var tchannelVersion = data['tchannelVersion'];
        var ringpopVersion = data['version'];
        var process = data['process'];
        var memory= process['memory'];
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
        var uptime = data['uptime'];
        uptime = uptime * 0.001;
        var uptimeHours = 0;
        var uptimeMinutes = 0;
        var uptimeSeconds = uptime;

        while(uptimeSeconds >= 60)
        {
          uptimeSeconds-=60;
          uptimeMinutes++;
        }

        while(uptimeMinutes >= 60)
        {
          uptimeMinutes-=60;
          uptimeHours++;
        }

        uptimeSeconds = Math.floor(uptimeSeconds);

        var alive = 0.0;
        var suspect = 0.0;
        var faulty = 0.0;

        for(var i = 0; i < members.length; i++)
        {
          member = members[i];

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

        var memberLength = parseFloat(members.length.toString());
        var alivePerc = (alive / memberLength) * 100.0;
        alivePerc = alivePerc.toFixed(2);
        var suspectPerc = (suspect / memberLength) * 100.0;
        suspectPerc = suspectPerc.toFixed(2);
        var faultyPerc = (faulty / memberLength) * 100.0;
        faultyPerc = faultyPerc.toFixed(2);
        var mLength = members.length;
        var ipAddresses = [];
        var memberShipList = "";
        for(var i = 0; i < members.length; i++) {
          member = members[i];
          memberShipList+="("+member['address']+")";
          memberShipList+="\n\n\n";
          ipAddresses.push(member['address']);
        }

        if(this.state.doonce == false)  {
            var ringPercentages = data['percentages'];
            console.log(ringPercentages);
            var json = {
              "name": this.props.txt,
              "children" : [
              ]
            }
            var dataset = [];
            var hashRange = 1000;
            for(var j = 0; j < mLength; j++)
            {
              json["children"].push({"name": members[j].address});
            }

            for(var j = 0; j < ringPercentages.length; j++)
            {
               var percentStr = "";
               percentStr += "" + ringPercentages[j].percentage + "%";
               var zson = {label: ringPercentages[j].address, percent: ringPercentages[j].percentage};
               dataset.push(zson);
            }

            var me = this.getDOMNode();
            console.log("ERS");
            console.log("ME: " + me);
            console.log(dataset);
            drawRing(me,dataset);
        }

        this.setState({doonce: true, data: blob, mLength: mLength, alivePerc: alivePerc, suspectPerc: suspectPerc,
          faultyPerc: faultyPerc, data6: memberShipList, ringpopVersion: ringpopVersion, tchannelVersion: tchannelVersion,
          uptimeHours: uptimeHours, uptimeMinutes: uptimeMinutes, uptimeSeconds: uptimeSeconds, timestamp: timestamp,
          timeYear: timeYear, timeMonth: timeMonth, timeDay: timeDay, timeHours: timeHours, timeMinutes: timeMinutes,
          timeSeconds: timeSeconds, memory: memory});

      }.bind(this),
      error: function (request, status, error) {
          console.log("TEST TEST TEST");
          var err = error.toString();
          var ip = err.split(":");
          var ip = request.responseText;
          ip = ip.split("&");
          ip = ip[1];
          if (ip)  {
              if (ip.contains(':')) {
                  document.location.href = "/service/" + serviceName + "?ip=" + ip;
              }
          }
       }
    });
  },
  componentDidMount: function() {
    // TODO: Render checksums server side.
    this.state.doonce = false;
    var serviceURL = window.location.pathname.split('/')[2];
    var address = window.location.search.slice(4);
    console.log("IP SLICE");
    this.setState({serviceAddress: window.location.search.slice(4)});
    console.log("componentDidMount");
    setInterval(this.loadRingInfoFromServer, 1000);

    $.ajax({
      url: "/admin/stats",
      dataType: 'json',
      data: { ip: window.location.search.slice(4)},
      cache: false,
      success: function(data){
        console.log(data);
        this.setState({origin: data});
        this.gatherChecksums();
      }.bind(this),
      error: function(xhr, status, err) {
        console.log(this.props.url, status, err.toString());
      }
    })
  },
  gatherChecksums: function() {
    console.log("Gathering checksums");
    $.ajax({
      url: '/checksums',
      dataType: 'json',
      data: {ip: window.location.search.slice(4)},
      cache: false,
      success: function(data) {
        console.log("Successfully retrieved all checksums");
        console.log(data);
        this.setState({memberships: data});
        this.setState({hasReadChecksums: true});
      }.bind(this),
      error: function(xhr, status, err){
        console.log(this.props.url, status, err.toString());
      }
    })
  },
  render: function() {

    var serviceURL = window.location.pathname.split('/')[2];
    var address = window.location.search.slice(4);
    console.log(serviceURL);
    console.log(address);
    console.log(this.props.data);
    var match = this.props.data.filter(function(service) {
      return service.serviceName === serviceURL && service.text === address;
    });
    console.log(match);
    match = match[0];
    serviceName = serviceURL;
    if (this.state.hasReadChecksums) {
      var state = this.state.origin.membership.members.map(function(obj){
        return obj.status;
      });

      var differentChecksums = 0;
      var checksums = [null];
      var lastChecksum = 1;
      var members = this.state.memberships.map(function(obj, index) {
        console.log(obj.checksum);
        if(lastChecksum != 0) {
            if(obj.checksum != lastChecksum) {
              var exists = false;
              for(var j = 0; j < checksums.length; j++) {
                  if(checksums[j] == obj.checksum) {
                      exists = true;
                  }
              }
              if(exists == false) {
                checksums.push(obj.checksum);
                differentChecksums++;
              }
            }
        }
        else {
          checksums.push(lastChecksum);
        }
        lastChecksum = obj.checksum;
        return <Members address={obj.node} checksum={obj.checksum} state={state[index]}></Members>
      });

      members.sort(function(a, b) {
          if (a.checksum > b.checksum) {
              return 1;
          }
          else
          if (a.checksum < b.checksum)  {
              return -1;
          }
          else {
              return 0;
          }
      })
    } 
    
    if(!this.state.hasReadChecksums){
      return (<div></div>);
    }

    return(
    <div className="service">
      <h1><center>{serviceName}</center></h1>

      <div className="datum">TChannel version: {this.state.tchannelVersion}</div><div className="datum">Ringpop version: {this.state.ringpopVersion}</div>
      <div className="datum">
      Uptime: {this.state.uptimeHours} hours {this.state.uptimeMinutes} minutes and {this.state.uptimeSeconds} seconds
      </div>
      <center>
      <div className="datum">

      Cluster information updated {this.state.timeYear}/{this.state.timeMonth}/{this.state.timeDay} {this.state.timeHours}:{this.state.timeMinutes}:{this.state.timeSeconds}
      </div>
      <div className="datum">
        <div className="green">Healthy: {this.state.alivePerc}%</div> <div className="yellow">Suspect: {this.state.suspectPerc}%</div>
      <div className="red">Faulty: {this.state.faultyPerc}%</div>
      </div>
      </center>

      <center>
      <div className="datum">
      Nodes in Cluster: {this.state.mLength}
      </div>
      <div className="datum">
          Unique Checksums: {differentChecksums}
      </div>
      <div className="datum">
       Memory Usage: {this.state.memory}
      </div>
      <p></p>
      <div className="datum">
        <MembershipListTab />
        <PieChartGraphTab />
      </div>
      <p></p>
      <table style={style.table}>
        <tbody>
          <tr style={style.table}>
            <th>IP Address</th>
            <th>State</th>
            <th>Checksum</th>
          </tr>
          {members}
        </tbody>
      </table>
      </center>
    </div>
    )
  }
})

React.render(
  <ServiceBox url="../services.json" pollInterval={2000} />,
  document.getElementById('content')
);

