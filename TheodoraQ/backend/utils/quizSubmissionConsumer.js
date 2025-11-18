// Kafka consumer for quiz submissions
const { consumer } = require('./kafkaClient');

async function startQuizSubmissionConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'quiz-submissions', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const submission = JSON.parse(message.value.toString());
      console.log('📥 Kafka: Received quiz submission:', submission);
      // TODO: Add scalable post-processing, analytics, notifications, etc.
    }
  });
}

startQuizSubmissionConsumer().catch(console.error);
