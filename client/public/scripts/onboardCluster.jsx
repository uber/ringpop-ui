var ClusterForm = React.createClass({
  checkAddress: function(address) {
    var parts = address.split(':');
    var ip = parts[0].split('.');
    var port = parts[1];
    return validateNum(port, 1, 65535) &&
      ip.length == 4 &&
      ip.every(function (segment) {
        return validateNum(segment, 0, 255);
      });
  },
  validateNum: function(input, min, max) {
    var num = num + input;
    return num >= min && num <= max && input === num.toString;
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var datacenterName = React.findDOMNode(this.refs.datacenterName).value.trim();
    var hostAddress = React.findDOMNode(this.refs.hostAddress).value.trim();
    console.log(datacenterName);
    if (!datacenterName || !hostAddress) {
      return;
    }
    React.findDOMNode(this.refs.datacenterName).value = '';
    React.findDOMNode(this.refs.hostAddress).value = '';
    console.log(document.getElementById('service'));
    var service = document.getElementById('service').innerHTML;
    console.log(service);
    this.handleClusterSubmit(service, datacenterName, hostAddress);
  },
  handleClusterSubmit: function(serviceName, datacenter, connectorNode) {

    this.setState({datacenterName}, function() {

      this.setState({serviceName: serviceName});
      $.ajax({
        url: '/onboard/cluster',
        dataType: 'json',
        type: 'POST',
        data: {serviceName, datacenter, connectorNode},
        success: function(data) {

          console.log("Success onboarding cluster");
          if (data.message) {
              if (data.message === 'No matching service found') {
                  //alert(data.message + '. Redirecting now');
                  document.location.href = '/';
                  return;
              }

          } else {
              //alert(JSON.stringify(data));
          }
          
          this.setState({data: data});
          globalData = "True";
          document.location.href = '/service/' + this.state.serviceName;
        }.bind(this),
        error: function(xhr, status, err) {
          console.log('Error');
          console.error(this.props.url, status, err.toString());
        }.bind(this)
      });
    });
  },
  render: function() {
    return (
      <form role="form" onSubmit={this.handleSubmit}>
        <h3>Onboard your cluster</h3>
        <div className="form-group">
          <label for="datacenterName">Datacenter Name </label>
          <input id="datacenterName" className="form-control" type="text" ref="datacenterName" />
          <label for="hostAddress">Host Address</label>
          <input id="hostAddress" className="form-control" type="text" ref="hostAddress" />
        </div>
        <input id="submit"type="submit" className="form-control" value="Add Service" onSubmit={this.handleSubmit}/>
      </form>
    );
  }
});

React.render(
  <ClusterForm url="../services.json" pollInterval={2000} />,
  document.getElementById('content')
);