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
 * Mix two objects together.
 *
 * @param {Object} target
 * @param {Object} source
 * @param {Boolean} non_agg: Aggressively mixin?
 */
var mixin = function (target, source, non_agg) {
  var keys = Object.keys(source),
      key;

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];

    if (non_agg) {
      if (!Object.hasOwnProperty(target, key)) {
        target[key] = source[key];
      }
    } else {
      target[key] = source[key];
    }
  }
};

/**
 * The HTTP REST Client prototype, the main export.
 *
 * @constructor
 * @param {Object} options: A hash of options for the client.
 */
var Client = exports.Client = function (options) {
  options = options || {};

  this.host     = options.host;
  this.secure   = options.secure   || false;
  this.port     = options.port     || (this.secure ? 443 : 80);
  this.path     = options.path     || '/';
  this.headers  = options.headers  || {};
  this.params   = options.params;
  this.type     = options.type;
  this.response = options.response;

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
Client.prototype._request = function (method, path, options, callback) {
  options          || (options = {})
  options.path     =  this.path + path;
  options.headers  =  options.headers  || this.headers;
  options.encoding =  'undefined' !== typeof options.encoding ?
                      options.encoding : 'utf8';
  options.response =  options.response || this.response;

  if (options.params || this.params) {
    if (!options.params) {
      options.params = this.params;
    }

    if (this.params) {
      mixin(options.params, this.params);
    }

    options.path += '?' + querystring.stringify(options.params);
  }

  options.type = options.type || this.type;
  if ('object' === typeof options.body) {
    if ('json' === options.type) {
      options.body = JSON.stringify(options.body);
    } else {
      options.type = 'form';
      options.body = querystring.stringify(options.body);
    }
  }

  if (options.body) {
    options.headers['Content-Length'] = Buffer.byteLength(options.body);

    if ('json' === options.type) {
      options.headers['Content-Type'] = 'application/json';
    } else if ('form' === options.type) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  } else if ('GET' !== method) {
    options.headers['Content-Length'] = '0';
  }

  var request = this._http.request({
    host:    this.host,
    port:    this.port,
    path:    options.path,
    method:  method,
    headers: options.headers
  }, function (response) {
    if (options.encoding) {
      response.setEncoding(options.encoding);
    }

    if (!options.encoding || options.stream) {
      if (callback) {
        callback(null, response, null);
      }
    } else {
      var body = '';

      response.on('data', function (data) {
        body += data;
      });

      response.on('end', function () {
        if ('json' === options.response) {
          try {
            body = JSON.parse(body);
          } catch (error) {
            return callback(error);
          }
        }

        if (callback) {
          callback(null, response, body);
        }
      });
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

  options.end = 'undefined' === typeof options.end ? true : options.end;
  if (options.end) {
    request.end();
  }

  return request;
};

['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(function (verb) {
  var lower_verb = verb.toLowerCase();

  /**
   * Wrappers around _request.
   *
   * @param {String} path: The base path
   * @param {Object} options
   * @param {Function} callback
   */
  Client.prototype[lower_verb] = function (path, options, callback) {
    if ('function' === typeof options) {
      callback = options;
      options  = null;
    }

    return this._request(verb, path, options, callback);
  };
});
