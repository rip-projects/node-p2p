/**
 * p2p node
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

var net = require('net'),
    inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter,
    Peer = require('./peer'),
    AllPeers = require('./all-peers'),
    AnyPeer = require('./any-peer'),
    es = require('event-stream');

var Node = function(options) {
    "use strict";

    if (!options.name) {
        throw new Error('Node should have unique name as identifier');
    }

    this.name = options.name;

    this.packer = options.packer || {
        pack: function(object) {
            return JSON.stringify(object);
        },
        unpack: function(ser) {
            return JSON.parse(ser);
        }
    };

    this.peerByName = {};
    this.peers = [];
    if (options.seeds) {
        for(var key in options.seeds) {
            var peerOptions = {
                name: key
            };

            for(var i in options.seeds[key]) {
                peerOptions[i] = options.seeds[key][i];
            }

            this.addPeer(peerOptions);
        }
    }

    this.server = net.createServer(this.onConnection_.bind(this));
    this.server.on('listening', function() {
        this.emit('listening');
    }.bind(this));

    this.all = new AllPeers(this, function(peer) {
        return true;
    }.bind(this));

    this.any = new AnyPeer(this, function(peer) {
        return true;
    }.bind(this));
};

inherits(Node, EventEmitter);

Node.prototype.addPeer = function(options) {
    "use strict";

    if (options.name === this.name) {
        options.isIdentity = true;
    }

    options.packer = this.packer;

    if (this.peerByName[options.name]) {
        throw new Error('Duplicate peer with name: ' + options.name);
    } else {
        var peer = this.peerByName[options.name] = new Peer(this, options);
        this.peers.push(peer);
    }
};

Node.prototype.getPeer = function(name) {
    return this.peerByName[name];
};

Node.prototype.onConnection_ = function(socket) {
    "use strict";

    socket.pipe(es.split())
        .pipe(es.map(function(data, cb) {
            try {
                var message = this.packer.unpack(data);
                message.origin = socket.address();
                this.emit.apply(this, [message.address, this.getPeer(message.from), message]);
            } catch(e) {
                // noop
            }
        }.bind(this)));
};

Node.prototype.listen = function(port, host, callback) {
    "use strict";

    this.server.listen.apply(this.server, arguments);
};

module.exports = Node;