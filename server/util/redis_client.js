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

var redis = require('redis');

function RedisClient(host, port) {
  this._host = host;
  this._port = port;
  this._client = redis.createClient();
}

RedisClient.prototype.returnClient = function() {
  return this._client;
};

RedisClient.prototype.connect = function() {
    this._client.on('connect', function() {
    });

    this._client.on('error', function() {
      console.log('Connection refused to redis');
    });
};

RedisClient.prototype.readList = function(key) {
    this._client.lrange(key, 0, -1, function(err, reply) {

    });
};

RedisClient.prototype.readList2 = function(key,cb) {
    this._client.lrange(key, 0, -1, function(err, reply) {
      cb(reply);
    });
};

RedisClient.prototype.readList3 = function(key,cb) {
    this._client.lrange(key, 0, -1, function(err, reply) {
        var responseObj = {address: key, history: reply};
        cb(null, responseObj);
    });
};

RedisClient.prototype.appendToList = function(key, val) {
    this._client.rpush([key, val], function(err, reply) {

    });
};

RedisClient.prototype.setKV2= function(key, val) {
    this._client.set(key, val, redis.print);
};

RedisClient.prototype.getV = function(key) {
    this._client.get(key, function(err, reply) {
    });
};

RedisClient.prototype.getTwoKeysReturnBoth = function(req, res, key, key2, cb, self) {
    self.get(key2, function(err, reply) {
          callback(key, req, res, reply, cb,self);
    });

    function callback(key, q, s, rep, cb, self) {
        self.get(key, function(err, reply) {
            if(!cb) {
              return;
            }
            cb(req, res, reply, rep);
        });
    }
};

RedisClient.prototype.getV_CB2 = function(req, res, key, cb) {
    this._client.get(key, function(err, reply) {
        if (reply == null) {
           cb(req, res, []);
        } else {
           cb(req, res, reply);
        }
    });

};

RedisClient.prototype.getV2 = function(key, params, cb) {
    this._client.get(key, function(err, reply) {
        cb(params, reply);
    });
};

RedisClient.prototype.getV3 = function(member, cb) {
    var address = member.address;
    member.clientInstance.get(address+"", function(err, reply) {
        cb(reply);
    });
};

RedisClient.prototype.getV4 = function(key, cb) {
    this._client.get(key, function(err, reply) {
        cb(reply);
    });
};

module.exports = RedisClient;
