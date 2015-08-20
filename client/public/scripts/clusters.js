var tooltipString = "Hello";
var serviceName;
var datacenter;
var clusterSize = 0;

var style = {
  whiteContent: {
    display: "none",
    position: "absolute",
    top: "25%",
    left: "25%",
    width: "50%",
    height: "150%",
    padding: "16px",
    border: "16px solid black",
    backgroundColor: "white",
    zIndex: "1002",
    overflow: "auto",
  },
  h1: {
    display: 'inline',
    paddingRight: '15px'
  },
  div: {
    margin: '2%'
  },
  buttons: {
    float: 'right'
  }
}
 
var Cluster = React.createClass({
  loadRingInfoFromServer: function() {
    console.log("loadRingInfoFromServer");
    console.log(this.props.address);
    $.ajax({
      url: "/admin/stats",
      dataType: 'json',
      data: { ip: this.props.address, datacenterName: this.state.myName, serviceName: serviceName},
      cache: false,
      success: function(data) {

        var response = JSON.stringify(data);
        var timestamp = 42;
        var membership = data['membership'];
        var members = membership['members'];
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
        var membershipList = "";
        var ipAddresses = [];
        for(var i = 0; i < members.length; i++) {
          member = members[i];
          membershipList+="("+member['address']+")";
          membershipList+="\n\n\n";
          ipAddresses.push(member['address']);
        }

        var hosts = data['hosts'];
        var hostAddresses = [];

        for (var i = 0; i < hosts.length; i++) {

            var h = hosts[i];
            h = h['hostAddress'];
            hostAddresses.push(""+h);
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
        }
        setTimeout(this.loadRingInfoFromServer, 1000 + (10 * mLength));
        this.setState({doonce: true, data: response, mLength: mLength, alivePerc: alivePerc, suspectPerc: suspectPerc, faultyPerc: faultyPerc,
          membershipList: membershipList, timestamp: timestamp, hosts: hosts, hostAddresses: hostAddresses, alive: alive, suspect: suspect,
          faulty: faulty});

      }.bind(this),
      error: function(xhr, status, err) {
        console.log('Error fetching stats');
        setTimeout(this.loadRingInfoFromServer, 5000);
        setState({rend: true});
      }.bind(this)
    });
  }, 
  getInitialState: function() {
  return {data: [],doonce: false, service: this.props.serviceName, datacenter: this.props.clusterName, rend: true,
    myName: this.props.clusterName};
  },
  componentDidMount: function() {
    this.loadRingInfoFromServer();
    setTimeout(this.loadRingInfoFromServer, 1000);
  },
  handleServiceClick: function() {
    document.location.href = "/service/" + serviceName + "/datacenter/" + this.state.datacenter;
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
  onUpdateDatacenterName: function(datacenter) {
    this.setState({
      datacenter: datacenter
    });
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

    if(this.state.rend) {
        return (
              <div>
              <h2 className="serviceAuthor" >
               <div className="inLine" onClick={this.handleToggleClick}>-  </div> <div className="breadcrumb" onClick={this.handleServiceClick}>{this.props.clusterName} {circles}</div>
              </h2> 
                Connected Node: {this.props.address}
                <p></p>
                {this.state.mLength} nodes
                <p></p>
                 {greenRectangle} {this.state.alive} alive
                <p></p>
                 {yellowRectangle} {this.state.suspect} suspect
                <p></p>
                 {redRectangle} {this.state.faulty} faulty
                <p></p>
              <RemoveEdit optimisticDelete={this.props.optimisticDelete} onUpdate={this.onUpdateDatacenterName} reactKey={this.props.reactKey} cluster={this.state.datacenter} address={this.props.address} boss="Hello"/>
              <br />
              </div>
      );
    }
    else {
        return (
              <div>
              <h2 className="serviceAuthor" >
               <div className="inLine" onClick={this.handleToggleClick}>+  </div> <div className="breadcrumb" onClick={this.handleServiceClick}>{this.props.clusterName} {circles}</div>
              </h2>
              </div>
      );
    }
  }
});

var PopUp = React.createClass({
  getInitialState: function() {
    var divid = 'light' + this.props.reactKey;
    var datacenterid = 'datacenter' + this.props.reactKey;
    var connectorid = 'connector' + this.props.reactKey;
    return {divId: divid, datacenterid: datacenterid, connectorid: connectorid};
  },
  handleEditClick: function() {
    // Make network call to edit cluster
    var cluster = this.state.cluster;
    var address = this.state.address;
    var service = window.location.href.split('/')[4];
    var oldCluster = this.props.cluster;

    console.log("Initiate network call to /cluster");
    $.ajax({
      url: "/cluster",
      dataType: 'json',
      type: 'PUT',
      data: {cluster: cluster, address: address, service: service, oldCluster: oldCluster},
      cache: false,
      success: function(data) {
        console.log(data);
        alert(data.message);
        if(data.id === 0 || data.id == 1) {
          console.log('Trigger optimisticUpdate');
          console.log(this.props);
          this.props.onUpdate(cluster);
        }
      }.bind(this),
      error: function(xhr, status, err) {
        console.log("Error network call to /cluster");
        console.log(status, err.toString());
      }
    });
    // remove div
    document.getElementById(this.state.divId).style.display='none';
    document.getElementById('fade').style.display='none';
    // wipe text inputs
    document.getElementById(this.state.datacenterid).value = '';
    document.getElementById(this.state.connectorid).value = '';

  },
  handleClusterChange: function(event) {
    this.setState({cluster: event.target.value});
  },
  handleAddressChange: function(event) {
    this.setState({address: event.target.value});
  },
  render: function() {
    return(
        <div id={this.state.divId} style={style.whiteContent}>
           <form role="form" onSubmit={this.handleEditClick}>
              <div className="form-group">
                <label for={this.state.datacenterid}><h4>New Datacenter</h4></label>
                <input type="text" className="form-control" placeholder="SJC1" id={this.state.datacenterid} onChange={this.handleClusterChange} />
                <label for={this.state.connectorid}><h4>New Address</h4></label>
                <input type="text" className="form-control" placeholder="127.0.0.1" id={this.state.connectorid} onChange={this.handleAddressChange} />
              </div>
              <button type="submit" className="btn btn-default">Edit service</button>
           </form>
        </div>
        
      )
  }
})

var RemoveEdit = React.createClass({
  getInitialState: function() {
    var divid = 'light' + this.props.reactKey;
    return {divId: divid};
  },
  removeCluster: function(){
    var cluster = this.props.cluster;
    var address = this.props.address;
    var service = window.location.href.split('/')[4];
    this.props.optimisticDelete(cluster, address, service);
    $.ajax({
      url: "/cluster",
      dataType: 'json',
      type: 'DELETE',
      data: { cluster: cluster, address:address, service: service},
      cache: false,
      success: function(data) {
        console.log("Successfully deleted cluster");
        console.log(data);

      },
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
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
        console.log(data);
      },
      error: function(xhr, status, err) {
        console.log(status, err.toString());
      }
    })
  },
  componentDidMount: function() {
    console.log("RemoveEdit---");
    console.log(this.props);
  },
  handleRemoveClick: function() {
    // get reference to service and remove it.
    // remove services from list.
    console.log("handleRemoveClick");
    this.removeCluster();
    
  },
  handleEditClick: function() {
    document.getElementById(this.state.divId).style.display='block';
    document.getElementById('fade').style.display='block';
    console.log("handleEditClick");
  },
  onUpdatePopUp: function(datacenter) {
    console.log("Triggered on RemoveEdit");
    console.log(datacenter);
    this.props.onUpdate(datacenter);
  },
  render: function() {
    $(document).ready(function() {
        console.log('Ready');
        $('#fade').click(function() {
          console.log('Black overlay clicked');
          document.getElementById(this.state.divId).style.display='none';
          document.getElementById('fade').style.display='none';
        }.bind(this));
    }.bind(this))
    
    return (
      <div className="addRemoveButtons">
        <div className="col-sm-3">
          <button className="btn btn-default btn-block" onClick={this.handleRemoveClick}>Remove Cluster</button>
        </div>
        <div className="col-sm-3">
          <button className="btn btn-default btn-block" onClick={this.handleEditClick}>Edit Cluster</button>
        </div>
        <PopUp onUpdate={this.onUpdatePopUp} reactKey={this.props.reactKey} cluster={this.props.cluster}/>
      </div>
  );
  }
})

var ClusterBox = React.createClass({

  loadServicesFromServer: function() {
    $.ajax({
      url: this.props.url, //services.json
      dataType: 'json',
      cache: false,
      success: function(data) {
        for (var i = 0; i < data.length; i ++) { 
            if(data[i].serviceName == serviceName) {
                this.setState({datacenters: data[i].datacenters});
            }
        }
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {datacenters: []};
  },
  componentDidMount: function() {
    serviceName = window.location.pathname.split('/')[2];
    this.loadServicesFromServer();
    setInterval(this.loadServicesFromServer, this.props.pollInterval);
  },
  optimisticDelete: function(cluster, address) {
      var updatedDatacenters = this.state.datacenters.filter(function(dc) {
          return !(dc.name === cluster && dc.connectorNode === address);
      });

      this.setState({datacenters: updatedDatacenters});
  },
  render: function() {
    return (
      <div className="ClusterBox">
        <ClusterList optimisticDelete={this.optimisticDelete} datacenters={this.state.datacenters} />
      </div>
    );
  }
});

var ClusterList = React.createClass({

  render: function() {
    var self = this;
    var clusterNodes = this.props.datacenters.map(function(cluster, index) {
      return (
        <Cluster optimisticDelete={self.props.optimisticDelete} reactKey={index} clusterName={cluster.name} address={cluster.connectorNode}>
        </Cluster>
      );
    });

    return (
      <div className="ClusterList">
        {clusterNodes}
      </div>
    );
  }
});
   
React.render(
  <ClusterBox url="../services.json" pollInterval={8000} />,
  document.getElementById('content')
);
