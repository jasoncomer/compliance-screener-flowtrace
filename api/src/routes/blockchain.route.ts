import express from 'express';
import * as blockchainController from '@src/controllers/blockchain.controller';
import * as attributionController from '@src/controllers/attribution.controller';

const router = express.Router();

router.post('/attributions', attributionController.getAttributions);

router.get('/address/:address', blockchainController.getAddressController);
router.get('/address/:address/summary', blockchainController.getAddressSummary);
router.get('/address/:address/transactions', blockchainController.getAddressTransactionsController);
router.get('/address/:address/transactions-with-cospend', blockchainController.getAddressTransactionsWithCospendController);

router.get('/cospend/:cospendId/transactions', blockchainController.getTransactionsByCospendIdController);

router.get('/block/:block', blockchainController.getBlock);
router.get('/transaction/:txhash', blockchainController.getTransaction);

// Wallet routes
router.get('/wallets', blockchainController.getWallets);
router.get('/wallets/:addr', blockchainController.getWalletByAddress);

router.get('/transactions/:address/getBlockStats', blockchainController.getAddressBlockStats);

router.get('/block/:block/transactions', blockchainController.getBlockTransactionsController);

export = router;
