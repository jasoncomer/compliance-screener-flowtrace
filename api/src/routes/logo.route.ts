import express from 'express';
import { Storage } from '@google-cloud/storage';
// import { errorHandler } from '../middlewares/errors';

const router = express.Router();
const storage = new Storage();
const bucketName = 'entity-logos';
const bucket = storage.bucket(bucketName);

/**
 * Proxy endpoint to fetch logos from Google Cloud Storage
 * @route GET /logos/:entityId
 * @param {string} entityId - The ID of the entity to fetch the logo for
 * @returns {binary} Logo image data
 */
router.get('/:entityId', async (req, res, next) => {
  try {
    const entityId = req.params.entityId;
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    let fileFound = false;
    let fileExtension = '';
    let contentType = 'image/png';

    for (const ext of possibleExtensions) {
      const fileName = `${entityId}${ext}`;
      try {
        const [exists] = await bucket.file(fileName).exists();
        if (exists) {
          fileFound = true;
          fileExtension = ext;
          contentType = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`;
          break;
        }
      } catch (err) {
        console.error(`Error checking file existence for ${fileName}:`, err);
      }
    }

    if (!fileFound) {
      return res.status(404).json({ error: true, message: 'Logo not found for this entity' });
    }

    const fileName = `${entityId}${fileExtension}`;
    const file = bucket.file(fileName);

    try {
      const [metadata] = await file.getMetadata();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      file.createReadStream().pipe(res);
    } catch (err) {
      res.status(500).json({ error: true, message: 'Error fetching logo', details: err instanceof Error ? err.message : String(err) });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Error fetching logo', details: err instanceof Error ? err.message : String(err) });
  }
});

// Apply error handling middleware
// router.use(errorHandler);

export default router;