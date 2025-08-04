import express from 'express';
import * as socialMediaController from '@src/controllers/socialMedia.controller';

const router = express.Router();

// Get news data for an address
router.get('/address/:address', socialMediaController.getNewsDataController);

// Get news data for a specific search context
router.get('/mentions/:searchTerm', socialMediaController.getMentionsDataController);


export = router; 