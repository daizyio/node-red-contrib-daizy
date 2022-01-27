let Mqtt = require('mqtt');

let TOPIC_PREFIX = `/out/integrations/`

module.exports = function(RED) {
	"use strict";

  RED.nodes.registerType("daizy events", DaizyEvents, {
		credentials : {
		  token : { type: 'text' }
		}
	});

	function DaizyEvents(n) {
    RED.nodes.createNode(this, n);
		if (!this.connection) {
			this.connect(n.token, n.endpoint);
		}
	}

	DaizyEvents.prototype.connect = function(token, endpoint) {
    this.status(this.SUBSCRIBING);
		if (!this.connection) {
			try {
        const clientId = `nodered-${token.substring(0, 8)}-${this.id}`;
        this.log(`Connecting ${clientId}`);
				this.connection = Mqtt.connect(endpoint, {
					username: token,
					password: token,
					clientId,
					clean: false,
          keepalive: 180,
          reconnectPeriod: 10
				});

        var self = this;

				this.connection.on('connect', function() {
					let devTopic = 'devices';
					if (endpoint == 'wss://mqtt-test.daizy.io') {
						devTopic = 'devices-dev';
					}
					const topic = devTopic + TOPIC_PREFIX + token;
					self.connection.subscribe(topic, { qos: 1 });
					self.log(`Daizy ready to go! (${clientId} subscribed to ${topic})`);
          self.status(self.SUBSCRIBED);
				});

				this.connection.on('error', function(err) {
					self.log('Something went wrong', err)
					self.status(self.ERROR);
				})

				this.connection.on('close', function () {
					self.log('Connection was closed')
          self.status(self.ERROR)
				})

				this.connection.on('message', function(topic, payload) {
          payload = JSON.parse(payload);
          self.log(`Received message on ${topic}`);
          self.send({
            topic : topic,
            payload : payload
          });
        });

			} catch(e) {
        this.log('Something went wrong', e)
				this.status(this.ERROR)
			}
		}
	};

  DaizyEvents.prototype.close = function() {
		if(this.connection) {
			this.log("Disconnecting")
			this.connection.end()
		}
	}

	DaizyEvents.prototype.SUBSCRIBING = {
		fill : "yellow",
		shape : "ring",
		text : "subscribing..."
	}

	DaizyEvents.prototype.SUBSCRIBED = {
		fill : "green",
		shape : "ring",
		text : "subscribed"
	}

	DaizyEvents.prototype.ERROR = {
		fill : "red",
		shape : "ring",
		text : "Error"
	}
};