import express from 'express';
import { isAuth } from '@src/middlewares';
import {
  createOrganizationController,
  inviteMembersController,
  joinOrganizationController,
  getOrganizationsController,
  getOrganizationByIdController,
  updateOrganizationController,
  deleteOrganizationController,
  getOrganizationMembersController,
  updateMemberRoleController,
  removeMemberController
} from '@src/controllers/organization.controller';
import {
  createOrganizationValidation,
  inviteMembersValidation,
  joinOrganizationValidation,
  updateOrganizationValidation,
  updateMemberRoleValidation
} from '@src/middlewares/validation/organizationValidation/organizationValidation';
import noteRoutes from './note.route';

const router = express.Router();

// Create and list organizations
router.post('/', isAuth, createOrganizationValidation, createOrganizationController);
router.get('/', isAuth, getOrganizationsController);

// Organization-specific operations
router.get('/:organizationId', isAuth, getOrganizationByIdController);
router.patch('/:organizationId', isAuth, updateOrganizationValidation, updateOrganizationController);
router.delete('/:organizationId', isAuth, deleteOrganizationController);

// Member operations
router.get('/:organizationId/members', isAuth, getOrganizationMembersController);
router.post('/:organizationId/invite', isAuth, inviteMembersValidation, inviteMembersController);
router.post('/join', isAuth, joinOrganizationValidation, joinOrganizationController);
router.patch('/:organizationId/members/:memberId/role', isAuth, updateMemberRoleValidation, updateMemberRoleController);
router.delete('/:organizationId/members/:memberId', isAuth, removeMemberController);

// Notes routes
router.use('/:organizationId/notes', noteRoutes);

export default router;
