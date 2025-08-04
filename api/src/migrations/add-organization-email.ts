import { modelFactory } from '../db/modelFactory';

/**
 * Migration to add email field to existing organizations
 * Sets the email to the owner's email for all existing organizations
 */
export const addOrganizationEmail = async () => {
  try {
    console.log('Starting migration: Add organization email field...');

    const Organization = await modelFactory.getModel('Organization');
    const User = await modelFactory.getModel('User');

    // Find all organizations without email field
    const organizations = await Organization.find({
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: '' }
      ]
    });

    console.log(`Found ${organizations.length} organizations without email field`);

    let updatedCount = 0;

    for (const org of organizations) {
      try {
        // Get the owner's email
        const owner = await User.findById(org.ownerId);

        if (owner && owner.email) {
          // Update the organization with the owner's email
          await Organization.findByIdAndUpdate(org._id, {
            email: owner.email
          });

          updatedCount++;
          console.log(`Updated organization "${org.name}" with email: ${owner.email}`);
        } else {
          console.warn(`Skipping organization "${org.name}" - owner not found or no email`);
        }
      } catch (error) {
        console.error(`Error updating organization "${org.name}":`, error);
      }
    }

    console.log(`Migration completed successfully. Updated ${updatedCount} organizations.`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addOrganizationEmail()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 