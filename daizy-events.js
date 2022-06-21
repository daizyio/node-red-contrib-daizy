let Mqtt = require('mqtt');
const NodeCache = require( "node-cache" );

const messageCache = new NodeCache({ 
	stdTTL: 3600, // 1 hour
	checkperiod: 300 // 5 minutes
});

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
	if(token === "" ){
		this.status(this.UNAUTHORIZED);
	}else{
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
          reconnectPeriod: 60000
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

				this.connection.on('close', function (err) {
					self.log('Connection was closed')
          self.status(self.ERROR)
				})

				this.connection.on('message', function(topic, payload) {
          payload = JSON.parse(payload);
          self.log(`Received message on ${topic}, with messageId: ${payload.messageId}`);
					if (payload.eventId) {
						self.log(`Checking cache for eventId: ${payload.eventId}`);
						if (messageCache.has(payload.eventId)) {
							self.log(`eventId: ${payload.eventId} exists in debounce cache - dropping message...`);
							return;
						} else {
							self.log(`eventId: ${payload.eventId} is not in debounce cache, caching and processing message...`);
							messageCache.set(payload.eventId, payload.messageId);
						}
					} else {
						self.log(`Message does not contain eventId so cannot check debounce cache...`);
					}
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

	DaizyEvents.prototype.UNAUTHORIZED = {
		fill : "red",
		shape : "ring",
		text : "Invalid Token"
	}
};
