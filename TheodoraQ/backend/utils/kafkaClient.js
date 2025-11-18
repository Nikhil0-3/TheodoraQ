// Kafka configuration and client setup
const { Kafka } = require('kafkajs');


const kafka = new Kafka({
  clientId: 'proctoring-app',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  },
  logLevel: 2 // INFO
});


const producer = kafka.producer({
  allowAutoTopicCreation: true,
  retry: {
    retries: 8
  }
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'proctoring-group',
  allowAutoTopicCreation: true
});

module.exports = { kafka, producer, consumer };