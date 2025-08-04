import { NextFunction, Response, Request } from 'express';
import { IAuthRequest } from '@src/interfaces';
import {
  createOrganizationService,
  inviteMembersService,
  joinOrganizationService,
  getOrganizationsService,
  getOrganizationByIdService,
  updateOrganizationService,
  deleteOrganizationService,
  getOrganizationMembersService,
  updateMemberRoleService,
  removeMemberService
} from '@src/services/organization.service';

export const createOrganizationController = (req: Request, res: Response, next: NextFunction) =>
  createOrganizationService(req as IAuthRequest, res, next);

export const inviteMembersController = (req: Request, res: Response, next: NextFunction) =>
  inviteMembersService(req as IAuthRequest, res, next);

export const joinOrganizationController = (req: Request, res: Response, next: NextFunction) =>
  joinOrganizationService(req as IAuthRequest, res, next);

export const getOrganizationsController = (req: Request, res: Response, next: NextFunction) =>
  getOrganizationsService(req as IAuthRequest, res, next);

export const getOrganizationByIdController = (req: Request, res: Response, next: NextFunction) =>
  getOrganizationByIdService(req as IAuthRequest, res, next);

export const updateOrganizationController = (req: Request, res: Response, next: NextFunction) =>
  updateOrganizationService(req as IAuthRequest, res, next);

export const deleteOrganizationController = (req: Request, res: Response, next: NextFunction) =>
  deleteOrganizationService(req as IAuthRequest, res, next);

export const getOrganizationMembersController = (req: Request, res: Response, next: NextFunction) =>
  getOrganizationMembersService(req as IAuthRequest, res, next);

export const updateMemberRoleController = (req: Request, res: Response, next: NextFunction) =>
  updateMemberRoleService(req as IAuthRequest, res, next);

export const removeMemberController = (req: Request, res: Response, next: NextFunction) =>
  removeMemberService(req as IAuthRequest, res, next); 