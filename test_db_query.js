const mongoose = require('mongoose');

// Connect to MongoDB (you'll need to update the connection string)
const MONGODB_URI = 'mongodb://localhost:27017/your_database_name';

async function queryDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Query BTCWallets collection
    const BtcWallets = mongoose.model('Wallets', new mongoose.Schema({
      addr: String,
      cospend_id: String
    }), 'wallets');

    const wallet = await BtcWallets.findOne({ addr: '3J7cUjBZxvGRCwFBz3q23zAsnhFfZrDSSU' });
    console.log('BTCWallets data:', wallet);

    // Query BtcAttribution collection
    const BtcAttribution = mongoose.model('Attribution', new mongoose.Schema({
      addr: String,
      entity: String,
      bo: String,
      custodian: String,
      cospend_id: String
    }), 'attributions');

    const attribution = await BtcAttribution.findOne({ addr: '3J7cUjBZxvGRCwFBz3q23zAsnhFfZrDSSU' });
    console.log('BtcAttribution data:', attribution);

    // Query SOT collection
    const SOT = mongoose.model('entity', new mongoose.Schema({
      entity_id: String,
      proper_name: String,
      entity_type: String
    }), 'entities');

    const sot = await SOT.findOne({ entity_id: '3J7cUjBZxvGRCwFBz3q23zAsnhFfZrDSSU' });
    console.log('SOT data:', sot);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

queryDatabase(); 