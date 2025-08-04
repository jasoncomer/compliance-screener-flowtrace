import express from 'express';
import { createReport } from '@src/services/report.service';

const router = express.Router();

router.post('/', createReport);

export = router;
