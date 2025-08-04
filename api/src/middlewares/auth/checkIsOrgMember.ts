import { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import { modelFactory } from '@src/db/modelFactory';
import { IAuthOrgRequest } from '@src/interfaces/generic';
import { IAuthRequest } from '@src/interfaces/User';

/**
 * Middleware to check if the authenticated user is a member of the specified organization
 */
export const isOrgMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as IAuthRequest).user?._id;
    const { organizationId } = (req as any).params;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated'
      });
    }

    if (!validateOrganizationId(organizationId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid organization ID'
      });
    }

    // Convert to consistent formats for querying
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Get Organization model through modelFactory
    const Organization = await modelFactory.getModel('Organization');

    // Check if organization exists and user is a member
    const organization = await Organization.findById(orgObjectId).lean();

    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
    }

    if (!checkUserMembership(organization, userObjectId.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this organization'
      });
    }

    // Attach the organization to the request for potential future use
    (req as IAuthOrgRequest).organization = organization;

    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking organization membership:', error);
    }
    res.status(500).json({
      status: 'error',
      message: 'Error checking organization membership'
    });
  }
};

// Split the middleware into smaller, focused functions
const validateOrganizationId = (organizationId: string) => {
  return organizationId && mongoose.Types.ObjectId.isValid(organizationId);
};

const checkUserMembership = (organization: any, userId: string) => {
  // Check if user is owner
  const isOwner = organization.ownerId &&
    organization.ownerId.toString() === userId;

  // Check if user is member
  const isMember = organization.members?.some(m =>
    m.userId && m.userId.toString() === userId && m.status === 'active'
  );

  return isOwner || isMember;
};