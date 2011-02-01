// The MIT License
// 
// Copyright (c) 2011 Tim Smart <tim@fostle.com>
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

var querystring = require('querystring');

/**
 * The HTTP REST Client prototype, the main export.
 *
 * @constructor
 * @param {Object} options: A hash of options for the client.
 */
var Client = exports.Client = function (options) {
  this.secure = options.secure || false;
  this.host   = options.host;
  this.port   = options.port   || (this.secure ? 443 : 80);
  this.path   = options.path   || '';

  this._http = this.secure ? require('https') : require('http');
};

/**
 * Alternative constructor.
 *
 * @param {Object} options: A hash of options for the client.
 */
exports.createClient = function (options) {
  return new Client(options);
};

/**
 * Request method used by all verbs.
 *
 * @param {Object} options: A hash of options for the request.
 * @param {Function} callback
 * @private
 */
Client.prototype._request = function (method, options, callback) {
  options.headers  = options.headers  || {};
  options.encoding = 'undefined' !== typeof options.encoding ?
                     options.encoding : 'utf8';

  if (options.params) {
    if ('object' === typeof options.params) {
      options.path += '?' + querystring.stringify(options.params);
    } else {
      options.path += '?' + options.params;
    }
  }

  if ('object' === typeof options.body) {
    if ('json' === options.type) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    } else {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.body = querystring.stringify(options.body);
    }
  }

  if (options.body) {
    options.headers['Content-Length'] = Buffer.byteLength(options.body);
  }

  console.log(this.host, this.port);
  console.log(options);

  var request = this._http.request({
    host:    this.host,
    port:    this.port,
    path:    options.path,
    method:  method,
    headers: options.headers
  }, function (response) {
    if (options.encoding) {
      response.setEncoding(options.encoding);
      var body = '';

      response.on('data', function (data) {
        body += data;
      });

      response.on('end', function () {
        if (callback) {
          callback(null, response, body);
        }
      });
    } else {
      if (callback) {
        callback(null, response, null);
      }
    }
  });

  request.on('error', function (error) {
    if (callback) {
      callback(error);
    }
  });

  if (options.body) {
    request.write(options.body);
  }

  request.end();

  return request;
};

['GET', 'POST', 'PUT', 'DELETE'].forEach(function (verb) {
  /**
   * Wrappers around _request.
   *
   * @param {String} path: The base path
   * @param {Object} options
   * @param {Function} callback
   */
  Client.prototype[verb.toLowerCase()] = function (path, options, callback) {
    options      = options || {};
    options.path = path;

    return this._request(verb, options, callback);
  };
});
