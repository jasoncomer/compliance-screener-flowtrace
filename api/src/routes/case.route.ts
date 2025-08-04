import express from 'express';
import { createCase, deleteCase, getCases } from '@src/services';
import { isAuth } from '@src/middlewares';

const router = express.Router();

router.post('/', isAuth, createCase);
router.get('/', isAuth, getCases);
router.delete('/:caseId', isAuth, deleteCase);

export = router;
