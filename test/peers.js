var p2p = require('../'),
    inherits = require('util').inherits;

var seeds = {
    'foo': {
        host: 'localhost',
        port: 3000
    },
    'bar': {
        host: 'localhost',
        port: 3001
    },
    'baz': {
        host: 'localhost',
        port: 3002
    },
};

var options = {
    seeds: seeds,
    packer: {
        pack: function(object) {
            "use strict";
            return JSON.stringify(object);
        },
        unpack: function(ser) {
            "use strict";
            return JSON.parse(ser);
        }
    }
};

var MyNode = function(name) {
    "use strict";

    var opts = {
        name: name
    };

    for(var i in options) {
        opts[i] = options[i];
    }

    MyNode.super_.call(this, opts);

    this.on('listening', function() {
        this.all.emit('topic:introduce');
    });

    this.on('topic:introduce', function(peer, message) {
        console.log('>', this.name, 'topic:introduce');
        try {
            this.addPeer({
                name: message.from,
                host: message.origin.address,
                port: message.origin.port
            });
        } catch(e) {
            // if already exist then ignore
        }
        peer.emit('topic:introduce-ack');
    });

    this.on('topic:introduce-ack', function(peer, message) {
        console.log('>', this.name, 'topic:introduce-ok');
    });

    this.on('topic:name', function(peer) {
        console.log('>', this.name, 'topic:name');
        try {
            peer.emit('topic:name-ack', 'Ganesha');
        }catch(e) {
            console.error(e);
        }
    });
};

inherits(MyNode, p2p.Node);

var nodeFoo = new MyNode('foo');
var nodeBar = new MyNode('bar');
var nodeBaz = new MyNode('baz');

nodeFoo.listen(3000, function() {
    console.log('Foo listening...');
});

nodeBar.listen(3001, function() {
    console.log('Bar listening...');
});

nodeBaz.listen(3002, function() {
    console.log('Baz listening...');
});

setTimeout(function() {
    nodeBaz.once('topic:name-ack', function(peer, message) {
        console.log('>', nodeBaz.name, 'topic:name-ack', arguments);
    });

    console.log('>', nodeBaz.name, 'send topic:name');
    nodeBaz.getPeer('bar').emit('topic:name');
}, 1000);