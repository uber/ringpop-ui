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
    addClusterDiv: {
        textAlign: 'center'
    }
}

var ServiceForm = React.createClass({
  componentDidMount: function() {
    var add_button = $("#addCluster");
    var form = $("#serviceDiv");
    var remove = $("#remove_field");
    var max_fields = 3;
    console.log(add_button);
    var x = 1;
    $(add_button).click(function(e) {
      e.preventDefault();
      if(x < max_fields) {
        $(form).append('<div class="div"><br/><label for="datacenter">Datacenter</label><input id="datacenter" ref="datacenter" class="form-control" type="text" name="datacenter[]"/><label for="address">Address</label><input id="address" ref="address" class="form-control" type="text" name="address[]"/><a href="#" id="remove_field">Remove</a></div>');
        x++;
      }
    });

    $(form).on("click", "#remove_field", function(e) {
      e.preventDefault();
      $(this).closest('.div').remove();
      x--;
      console.log('here');
    });

  },
  handleSubmit: function(e) {
    e.preventDefault();
    var serviceName = React.findDOMNode(this.refs.serviceName).value.trim();
    var datacenters = [];
    var addresses = [];

    console.log(serviceName);
    console.log(this.refs);

    var serviceForm= document.forms.serviceForm;

    var datacenterFields = serviceForm.elements['datacenter[]'];
    var addressesFields = serviceForm.elements['address[]'];


    if(!(datacenterFields && addressesFields)) {
        this.handleServiceSubmit(serviceName, null, null);
        return;
    }

    if(datacenterFields.length === undefined) {
        datacenters.push(datacenterFields.value);
        addresses.push(addressesFields.value);
    } else {

        for (var i = 0; i < datacenterFields.length; i++) {
            console.log(datacenterFields[i].value);
            datacenters.push(datacenterFields[i].value);
        }

        for (var i = 0; i < addressesFields.length; i++) {
            console.log(addressesFields[i].value);
            addresses.push(addressesFields[i].value);
        }
    }

    React.findDOMNode(this.refs.serviceName).value = '';

    this.handleServiceSubmit(serviceName, datacenters, addresses);
  },
  handleServiceSubmit: function(serviceName, datacenters, addresses) {

    var body = {
        serviceName: serviceName
    }

    if (datacenters && addresses) {
        body.datacenters = datacenters;
        body.addresses = addresses;
    }

    this.setState({serviceName}, function() {
      $.ajax({
        url: 'services.json',
        dataType: 'json',
        type: 'POST',
        data: body,
        success: function(data) {
          console.log("Success onboarding service");
          this.setState({data: data});
          globalData = "True";
          document.location.href = '/';
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
      <div>
        <form id="serviceForm" role="form" onSubmit={this.handleSubmit}>
          <h3>Onboard your service</h3>
          <div className="col-xs-6">
            <div id="serviceDiv" className="form-group">
              <label for="service"><h4>Service Name</h4></label>
              <input type="text" size="36" className="form-control" id="service" ref="serviceName" required/>
            </div>
            <button type="submit" className="btn btn-default" onClick={this.handleSubmit}>Submit</button>
          </div>
        </form>
        <div style={style.addClusterDiv} className="col-xs-4 col-xs-offset-1">
            <h4>Add cluster</h4>
            <button id="addCluster" className="btn btn-default" >
              <span className="glyphicon glyphicon-plus"></span>
            </button>
        </div>
      </div>
    );
  }
});

React.render(
  <ServiceForm />,
  document.getElementById('content')
);