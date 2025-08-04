import express from 'express';
import { isAuth } from '@src/middlewares';
import { isOrgMember } from '@src/middlewares/auth/checkIsOrgMember';
import {
  createNoteController,
  getOrganizationNotesController,
  getNoteByIdController,
  updateNoteController,
  deleteNoteController,
  getTransactionNotesController,
  getAddressNotesController
} from '@src/controllers/note.controller';

// Create router with mergeParams option to access parent router parameters
const router = express.Router({ mergeParams: true });

// These routes will be mounted under /organizations/:organizationId/notes
router.post('/', isAuth, isOrgMember, createNoteController);
router.get('/', isAuth, isOrgMember, getOrganizationNotesController);

// Transaction and Address specific notes - defined before the generic :noteId route
router.get('/transaction/:transactionId', isAuth, isOrgMember, getTransactionNotesController);
router.get('/address/:address', isAuth, isOrgMember, getAddressNotesController);

// Generic note operations by ID
router.get('/:noteId', isAuth, isOrgMember, getNoteByIdController);
router.patch('/:noteId', isAuth, isOrgMember, updateNoteController);
router.delete('/:noteId', isAuth, isOrgMember, deleteNoteController);

export default router; 