import { RequestHandler } from 'express';
import validator from '../validator';
import { organizationSchema } from './organizationSchema';

export const createOrganizationValidation: RequestHandler = (req, res, next) =>
  validator(organizationSchema.createOrganization, req.body, next);

export const inviteMembersValidation: RequestHandler = (req, res, next) =>
  validator(organizationSchema.inviteMembers, req.body, next);

export const joinOrganizationValidation: RequestHandler = (req, res, next) =>
  validator(organizationSchema.joinOrganization, req.body, next);

export const updateOrganizationValidation: RequestHandler = (req, res, next) =>
  validator(organizationSchema.updateOrganization, req.body, next);

export const updateMemberRoleValidation: RequestHandler = (req, res, next) =>
  validator(organizationSchema.updateMemberRole, req.body, next); 