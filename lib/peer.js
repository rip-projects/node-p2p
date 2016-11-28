/**
 * p2p peer
 *
 * MIT LICENSE
 *
 * Copyright (c) 2014 PT Sagara Xinix Solusitama - Xinix Technology
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @author     Ganesha <reekoheek@gmail.com>
 * @copyright  2014 PT Sagara Xinix Solusitama
 */

var inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter,
    net = require('net'),
    Message = require('./message');

var Peer = function(node, options) {
    "use strict";

    var emit_ = this.emit;

    Object.defineProperties(this, {
        name: {
            value: options.name,
            enumerable: true,
            writable: false,
            configurable: false
        },
        host: {
            value: options.host || 'localhost',
            enumerable: true,
            writable: false,
            configurable: false
        },
        port: {
            value: options.port || 0,
            enumerable: true,
            writable: false,
            configurable: false
        },
        isIdentity: {
            value: options.isIdentity || false,
            enumerable: true,
            writable: false,
            configurable: false
        },
        isConnected: {
            value: false,
            enumerable: true,
            writable: true,
            configurable: false
        },
        isConnecting: {
            value: false,
            enumerable: true,
            writable: true,
            configurable: false
        },
        reconnectAttempt: {
            value: options.reconnectAttempt || 3,
            enumerable: true,
            writable: true,
            configurable: false
        },
        reconnect_: {
            value: 0,
            enumerable: true,
            writable: true,
            configurable: false
        },
        node: {
            value: node,
            enumerable: false,
            writable: false,
            configurable: false
        },
        socket: {
            value: null,
            enumerable: false,
            writable: true,
            configurable: false
        },
        queue: {
            value: [],
            enumerable: false,
            writable: true,
            configurable: false
        },
        emit: {
            value: function(eventName, message) {
                if (eventName.indexOf('topic:') === 0 || eventName.indexOf('queue:') === 0) {
                    if (!(message instanceof Message)) {
                        message = new Message(message);
                    }

                    message.address = eventName;

                    this.queue.push(message);
                    this.emit('put', message);
                } else {
                    return emit_.apply(this, arguments);
                }
            },
            enumerable: false,
            writable: false,
            configurable: false
        }
    });

    this.on('put', this.send);
    this.on('connect', this.send);

    this.connect();
};

inherits(Peer, EventEmitter);

Peer.prototype.connect = function() {
    "use strict";

    if (this.isIdentity) {
        return;
    }

    if (this.isConnected) {
        return;
    }

    if (this.isConnecting) {
        return;
    }

    // console.log('try reconnecting %s:%s', this.host, this.port);
    this.isConnecting = true;
    this.reconnect_++;

    this.socket = net.connect(this.port, this.host, function() {
        this.reconnect_ = 0;

        this.isConnected = true;
        this.isConnecting = false;

        this.emit('connect');
    }.bind(this));

    this.socket.on('error', function() {
        // noop
    });

    this.socket.on('close', function() {
        this.socket = null;

        this.node.emit('disconnect', this);

        this.isConnected = false;
        this.isConnecting = false;

        if (this.reconnect_ < this.reconnectAttempt) {
            setTimeout(function() {
                this.connect();
            }.bind(this), 1000);
        }
    }.bind(this));
};

Peer.prototype.send = function() {
    "use strict";

    if (this.isConnected && this.queue.length > 0) {
        this.queue.forEach(function(message) {
            message.from = this.node.name;
            message.to = this.name;
            this.socket.write(this.node.packer.pack(message) + "\n");
        }.bind(this));

        this.queue.splice(0);
    }
};

module.exports = Peer;