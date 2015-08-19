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


var style = {
  whiteContent: {
    display: "none",
    position: "absolute",
    top: "25%",
    left: "25%",
    width: "50%",
    height: "250%",
    padding: "16px",
    border: "16px solid black",
    backgroundColor: "white",
    zIndex: "1002",
    overflow: "auto"
  },
  h1: {
    display: 'inline',
    paddingRight: '15px'
  },
  div: {
    margin: '2%'
  },
  span: {
    display: 'inline-block',
    margin: '10px'
  },
  removeEdit: {
    display: 'inline',
    float: 'right'
  }
};

var updateNow = false;

var Service = React.createClass({
  handleServiceClick: function() {
    document.location.href = "/service/" + this.props.serviceName;  
  },
  changeService: function(serv, addr) {
    this.setState({service: serv, address: addr});
  },
  render: function() {
    return (
      <div style={style.div}> 
            <ul className="list-group-item" key={this.props.reactKey}>
              <a style={style.link} href={"/service/" + this.props.serviceName}><h2 style={style.h1}>{this.props.serviceName}</h2></a>
              {this.renderTags()}
              <RemoveEdit optimisticDeletionUpdate={this.props.optimisticDeletionUpdate} reactKey={this.props.reactKey} key={this.props.key} service={this.props.serviceName} />
            </ul>
      </div>
    );
  },
  renderTags: function() {
    var self = this;
    return this.props.datacenter.map(function(dc) {

      return <span style={this.style.span} className="label label-default">{dc.name}</span>
    })
  }
});

var RemoveEdit = React.createClass({
  removeService: function(){
    this.props.optimisticDeletionUpdate(this.props.service);
    $.ajax({
      url: "/service",
      dataType: 'json',
      type: 'DELETE',
      data: { serviceName: this.props.service},
      cache: false,
      success: function(data) {
      },
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    })
  },
  handleRemoveClick: function() {
    this.removeService();
  },
  handleEditClick: function() {
    var divId = "light" + this.props.reactKey;
    document.getElementById(divId).style.display='block';
    document.getElementById('fade').style.display='block';
  },
  handleServiceChange: function(event) {
    this.setState({service: event.target.value});
  },
  render: function() {
    return (
      <div style={style.removeEdit} className="addRemoveButtons">
        <button className="btn btn-default" onClick={this.handleRemoveClick}>Remove Service</button>
        <button className="btn btn-default" onClick={this.handleEditClick}>Edit Service</button>
        <PopUp reactKey={this.props.reactKey} service={this.props.service} />
      </div>
      );
  }
})

var PopUp = React.createClass({
  getInitialState: function() {
    var divid = 'light' + this.props.reactKey;
    var buttonScript = "if (event.keyCode == 13) document.getElementById(" + divid + ").click()";
    return {service: "", divId:divid, buttonScript: buttonScript};
  },
  componentDidMount: function() {
    $(document).ready(function() {
        $('#fade').click(function() {
          document.getElementById(this.state.divId).style.display='none';
          document.getElementById('fade').style.display='none';
        }.bind(this));
    }.bind(this))
  },
  handleEditClick: function() {
    $.ajax({
      url: "/service",
      dataType: 'json',
      type: 'PUT',
      data: {service: this.state.service, oldService: this.props.service},
      cache: false,
      success: function(data) {
        // TODO: Optimistic update here
        updateNow = true;
        //alert(data.status);
      },
      error: function(xhr, status, err) {
        console.log(status, err.toString());
      }
    });
    document.getElementById(this.state.divId).style.display='none';
    document.getElementById('fade').style.display='none';
    React.findDOMNode(this.refs.changeService).value ='';
  },
  handleServiceChange: function(event) {
    this.setState({service: event.target.value});
  },
  render: function() {
    return(
        <div id={this.state.divId} style={style.whiteContent} className="input-group">
           New Service Name: <input type="text" onChange={this.handleServiceChange} ref="changeService" className="form-control"/>
           <span className="input-group-btn" >
              <button style={style.editButton} className="btn btn-default" id={this.state.divId} onClick={this.handleEditClick}>Edit service</button>
           </span >
        </div>
      )
  }
})

var ServiceBox = React.createClass({
  loadServicesFromServer: function() {
    console.log("loadServicesFromServer");
    $.ajax({
      url: this.props.url, //services.json
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.log('Error retrieving service');
        // how do we handle this?
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  optimisticDeletionUpdate: function(deletedService) {
    console.log('Updated triggered');
    var updatedList = this.state.data.filter(function(service) {
        console.log(deletedService);
        console.log(service);
        return deletedService !== service.serviceName;
    });
    console.log(updatedList);
    this.setState({data: updatedList});
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    this.loadServicesFromServer();
    setInterval(this.loadServicesFromServer, this.props.pollInterval);
  },
  render: function() {

    if (updateNow == true) {
      updateNow = false;
      this.loadServicesFromServer();
    }
    return (
      <div className="serviceBox">
        <ServiceList optimisticDeletionUpdate={this.optimisticDeletionUpdate} data={this.state.data} />
      </div>
    );
  }
});

var ServiceList = React.createClass({
  render: function() {
    var self = this;
    var serviceNodes = this.props.data.map(function(service, index) {
      return (
        <Service optimisticDeletionUpdate={self.props.optimisticDeletionUpdate} serviceName={service.serviceName} reactKey={index}key={index} datacenter={service.datacenters}>
        </Service>
      );
    });
    if(serviceNodes.length == 0) {
      return(
        <div className="serviceList">
          <h4>Onboard a service!</h4>
        </div>
      )
    }
    else {
      return (
        <div className="serviceList">
          {serviceNodes}
        </div>
      );
    }
  }
});

React.render(
  <ServiceBox url="services.json" pollInterval={3000} />,
  document.getElementById('content')
);
