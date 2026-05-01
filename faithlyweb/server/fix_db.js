import { savingsGoals } from './src/config/db.js';

async function fix() {
  console.log('Resetting Vacation Fund to 20,000...');
  const result = await savingsGoals.updateMany(
    { name: 'Vacation Fund' },
    { $set: { savedAmount: 20000 } }
  );
  console.log(`Updated ${result.modifiedCount} goals!`);
  process.exit(0);
}

// Give DB time to connect
setTimeout(fix, 3000);
