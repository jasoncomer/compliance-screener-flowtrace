import * as cron from 'node-cron';

// Test cron expression
const cronExpression = '0 * * * *'; // Every hour at minute 0

console.log('Testing cron expression:', cronExpression);
console.log('Is valid?', cron.validate(cronExpression));

// Test with a more frequent schedule for testing
const testExpression = '*/1 * * * *'; // Every minute
console.log('\nTest expression (every minute):', testExpression);
console.log('Is valid?', cron.validate(testExpression));

// Create a test job
const testJob = cron.schedule('*/10 * * * * *', () => {
  console.log('Test cron job executed at:', new Date().toISOString());
});

console.log('\nStarting test job (runs every 10 seconds)...');
testJob.start();

// Stop after 30 seconds
setTimeout(() => {
  testJob.stop();
  console.log('Test job stopped');
  process.exit(0);
}, 30000);