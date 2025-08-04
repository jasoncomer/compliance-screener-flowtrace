import mongoose from 'mongoose';
import { environmentConfig } from '@src/configs';

/**
 * Migration to add billingPeriod field to existing subscriptions
 * This script should be run once to update existing subscriptions
 */
export const addBillingPeriodMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(environmentConfig.MONGODB_CONNECTION_STRING as string);
    console.log('Connected to MongoDB');

    // Get the OrganizationSubscription model
    const OrganizationSubscription = mongoose.model('OrganizationSubscription');

    // Find all subscriptions that don't have billingPeriod field
    const subscriptionsWithoutBillingPeriod = await OrganizationSubscription.find({
      billingPeriod: { $exists: false }
    });

    console.log(`Found ${subscriptionsWithoutBillingPeriod.length} subscriptions without billingPeriod`);

    if (subscriptionsWithoutBillingPeriod.length > 0) {
      // Update all subscriptions to add billingPeriod field with default value 'monthly'
      const result = await OrganizationSubscription.updateMany(
        { billingPeriod: { $exists: false } },
        { $set: { billingPeriod: 'monthly' } }
      );

      console.log(`Updated ${result.modifiedCount} subscriptions with billingPeriod: 'monthly'`);
    } else {
      console.log('All subscriptions already have billingPeriod field');
    }

    // Verify the migration
    const remainingSubscriptionsWithoutBillingPeriod = await OrganizationSubscription.find({
      billingPeriod: { $exists: false }
    });

    if (remainingSubscriptionsWithoutBillingPeriod.length === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`❌ Migration incomplete. ${remainingSubscriptionsWithoutBillingPeriod.length} subscriptions still missing billingPeriod`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  addBillingPeriodMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 