import { Types } from 'mongoose';
import { NextFunction, Response } from 'express';
import createHttpError from 'http-errors';
import { customResponse } from '@src/utils';
import { modelFactory } from '@src/db/modelFactory';
import { IAuthRequest } from '@src/interfaces';
import { environmentConfig } from '@src/configs/custom-environment-variables.config';
import { sendOrganizationInviteEmail } from '@src/utils/sendEmail';
import { EMemberRole, IMember, IOrganization } from '@src/interfaces/organization';
import { TierManager } from '@src/configs/tier-config';


export const isOwnerOrAdmin = (organization: IOrganization, userId: Types.ObjectId) => {
  return organization.ownerId.equals(userId) || organization.members.some(m => m.userId?.equals(userId) && m.role === EMemberRole.ADMIN);
};

export const isMemberOfOrganization = (organization: IOrganization, userId: Types.ObjectId) => {
  return organization.members.some(m => m.userId?.equals(userId) && m.status === 'active');
};

export const createOrganizationService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, settings } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');

    // Check user's tier limits for creating organizations
    // First, find any organization they belong to get their subscription tier
    const userOrganization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId, 'members.status': 'active' }
      ]
    });

    let maxOrganizations: number;
    let tierName: string;

    if (userOrganization) {
      // Get the user's subscription to check limits
      const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');
      const subscription = await OrganizationSubscription.findOne({ organizationId: userOrganization._id });

      if (subscription) {
        const tier = TierManager.getTierById(subscription.tierId);
        maxOrganizations = tier ? tier.features.maxOrganizations : TierManager.getDefaultTier().features.maxOrganizations;
        tierName = tier ? tier.name : TierManager.getDefaultTier().name;
      } else {
        // No subscription found, use default tier
        const defaultTier = TierManager.getDefaultTier();
        maxOrganizations = defaultTier.features.maxOrganizations;
        tierName = defaultTier.name;
      }
    } else {
      // New user, use default tier limits
      const defaultTier = TierManager.getDefaultTier();
      maxOrganizations = defaultTier.features.maxOrganizations;
      tierName = defaultTier.name;
    }

    // Check if user can create more organizations
    const count = await Organization.countDocuments({ ownerId: userId });
    if (count >= maxOrganizations) {
      return next(createHttpError(403, `You have reached the maximum number of organizations you can create (${count}/${maxOrganizations}) for the ${tierName} tier. Please upgrade your subscription.`));
    }

    // Set initial tier-based defaults for the organization
    const defaultTier = TierManager.getDefaultTier();
    const organizationSettings = {
      maxMembers: defaultTier.features.maxMembers,
      ...settings,
      inviteCode: 'TEMP' // Will be updated after save
    };

    // Get the owner's email to set as default organization email
    const User = await modelFactory.getModel('User');
    const owner = await User.findById(userId);
    if (!owner) {
      return next(createHttpError(404, 'Owner not found'));
    }

    // Create new organization with temporary invite code
    const organization = new Organization({
      name,
      description,
      email: owner.email, // Set organization email to owner's email by default
      ownerId: userId,
      settings: organizationSettings,
      members: [{
        userId: userId,
        role: EMemberRole.ADMIN,
        status: 'active',
        invitedBy: userId,
        joinedAt: new Date()
      }]
    });

    // Save first to get the organization ID
    await organization.save();

    // Generate and update invite code
    organization.settings.inviteCode = await organization.generateInviteCode();
    await organization.save();

    // Create a default subscription for the new organization
    const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');
    const defaultTierConfig = TierManager.getDefaultTier();

    await OrganizationSubscription.create({
      organizationId: organization._id,
      tierId: defaultTierConfig.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date('2099-12-31'), // Free tier doesn't expire
    });

    return res.status(201).json(
      customResponse({
        success: true,
        error: false,
        message: 'Organization created successfully',
        status: 201,
        data: organization
      })
    );
  } catch (error) {
    console.error('Error creating organization:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const inviteMembersService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emails, role = EMemberRole.TEAM_MEMBER } = req.body;
    const organizationId = req.params.organizationId;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { _id: organizationId, ownerId: userId },
        { _id: organizationId, 'members.userId': userId, 'members.status': 'active' }
      ]
    });
    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you do not have access'));
    }

    // Check if user has permission to invite members (must be owner, admin, or manager)
    const userMember = organization.members.find(m => m.userId?.toString() === userId.toString());
    if (!userMember || (userMember.role !== EMemberRole.ADMIN && userMember.role !== EMemberRole.MANAGER && organization.ownerId.toString() !== userId.toString())) {
      return next(createHttpError(403, 'You do not have permission to invite members'));
    }

    // Check if organization has reached member limit
    if (organization.members.length + emails.length > organization.settings.maxMembers) {
      return next(createHttpError(400, `Cannot invite ${emails.length} members. Organization would exceed maximum member limit of ${organization.settings.maxMembers}`));
    }

    // Check allowed domains if configured
    const allowedDomains = organization.settings.allowedDomains || [];
    if (allowedDomains.length > 0) {
      const invalidEmails = emails.filter(email => {
        const domain = email.split('@')[1];
        return !allowedDomains.includes(domain);
      });

      if (invalidEmails.length > 0) {
        return next(createHttpError(400, `The following email domains are not allowed: ${invalidEmails.join(', ')}`));
      }
    }

    const User = await modelFactory.getModel('User');
    const inviter = await User.findOne({ _id: userId });
    if (!inviter) {
      return next(createHttpError(404, 'Inviter not found'));
    }

    // Process each email
    const inviteResults = await Promise.all(emails.map(async (email) => {
      // Check if user already exists
      const existingUser = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });

      // Check if user is already a member
      if (existingUser) {
        const isMember = organization.members.some(m => m.userId?.toString() === existingUser._id.toString());
        if (isMember) {
          return { email, status: 'already_member' };
        }
      }

      // Generate invite link
      const inviteCode = await organization.generateInviteCode();
      const inviteLink = `${environmentConfig.WEBSITE_URL}/organizations/join?code=${inviteCode}&email=${encodeURIComponent(email)}`;

      // Add pending member
      const newMember: IMember = {
        userId: existingUser ? existingUser._id : null,
        email: existingUser ? undefined : email,
        role,
        status: 'pending',
        invitedBy: userId,
        joinedAt: new Date(),
      };
      organization.members.push(newMember);

      // Send invitation email
      await sendOrganizationInviteEmail(
        email,
        organization.name,
        inviter.name,
        inviteLink,
        organization.email
      );

      return { email, status: 'invited' };
    }));

    // Save the updated organization
    await organization.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Invitations sent successfully',
        status: 200,
        data: {
          inviteResults
        }
      })
    );
  } catch (error) {
    console.error('Error inviting members:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const joinOrganizationService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, email } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({ 'settings.inviteCode': code });

    if (!organization) {
      return next(createHttpError(404, 'Invalid invite code'));
    }

    // Find the pending invitation for this email
    const pendingMember = organization.members.find(m =>
      m.status === 'pending' &&
      ((m.email && m.email.toLowerCase() === email.toLowerCase()) ||
        (m.userId && m.userId.toString() === userId.toString()))
    );

    if (!pendingMember) {
      return next(createHttpError(404, 'No pending invitation found for this email'));
    }

    // Update member status to active
    pendingMember.status = 'active';
    pendingMember.userId = userId;
    pendingMember.email = undefined; // Clear email since we now have the user ID
    pendingMember.joinedAt = new Date();

    await organization.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Successfully joined organization',
        status: 200,
        data: {
          organization: {
            id: organization._id,
            name: organization.name,
            role: pendingMember.role
          }
        }
      })
    );
  } catch (error) {
    console.error('Error joining organization:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const getOrganizationsService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organizations = await Organization.find({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });

    const User = await modelFactory.getModel('User');
    const userIds = organizations.flatMap(org => org.members.map(m => m.userId));
    userIds.push(...organizations.map(org => org.ownerId));
    const users = await User.find({ _id: { $in: userIds } }).select('name surname email status _id');

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Organizations retrieved successfully',
        status: 200,
        data: {
          organizations,
          users
        }
      })
    );
  } catch (error) {
    console.error('Error getting organizations:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const getOrganizationByIdService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      _id: organizationId,
      'members.userId': userId,
      'members.status': 'active'
    }).select('-members.email'); // Don't send pending member emails

    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you do not have access'));
    }

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Organization retrieved successfully',
        status: 200,
        data: organization
      })
    );
  } catch (error) {
    console.error('Error getting organization:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const updateOrganizationService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const { name, description, email, settings } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { _id: organizationId, ownerId: userId },
        { _id: organizationId, 'members.userId': userId, 'members.status': 'active' }
      ]
    });

    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you do not have access'));
    }

    // Check if user is authorized (must be owner or admin)
    const userMember = organization.members.find(m => m.userId?.toString() === userId.toString());
    const isOwner = organization.ownerId.toString() === userId.toString();
    const isAdmin = userMember && userMember.role === EMemberRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return next(createHttpError(403, 'Only the organization owner or admin can update organization details'));
    }

    // Update fields
    if (name) organization.name = name;
    if (description) organization.description = description;
    if (email) organization.email = email;
    if (settings) {
      // Update only allowed settings
      if (settings.maxMembers) organization.settings.maxMembers = settings.maxMembers;
      if (settings.allowedDomains) organization.settings.allowedDomains = settings.allowedDomains;
      if (settings.riskScoreThreshold !== undefined) organization.settings.riskScoreThreshold = settings.riskScoreThreshold;
      if (settings.transactionThreshold !== undefined) organization.settings.transactionThreshold = settings.transactionThreshold;
      if (settings.allowCSAM !== undefined) organization.settings.allowCSAM = settings.allowCSAM;
    }
    await organization.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Organization updated successfully',
        status: 200,
        data: organization
      })
    );
  } catch (error) {
    console.error('Error updating organization:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const deleteOrganizationService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      _id: organizationId,
      ownerId: userId // Only owner can delete organization
    });

    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you are not the owner'));
    }

    await organization.deleteOne();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Organization deleted successfully',
        status: 200,
        data: null
      })
    );
  } catch (error) {
    console.error('Error deleting organization:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const getOrganizationMembersService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user?._id;

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { _id: organizationId, ownerId: userId },
        { _id: organizationId, 'members.userId': userId, 'members.status': 'active' }
      ]
    });
    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you do not have access'));
    }
    console.log(organization);

    // Filter out pending members unless user is a manager or owner
    const userIds: Types.ObjectId[] = [];
    const members = organization.members.filter(m => {
      if (m.userId == null || m.status !== 'active') return false;
      userIds.push(m.userId);
      return true;
    });
    console.log(members);

    const User = await modelFactory.getModel('User');
    const users = await User.find({
      _id: { $in: userIds },
      status: 'active'
    }).select('name surname email');
    const membersWithUsers = members.map(m => {
      const user = users.find(u => u._id.toString() === m.userId?.toString());
      return {
        ...m,
        user
      };
    });

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Members retrieved successfully',
        status: 200,
        data: membersWithUsers
      })
    );
  } catch (error) {
    console.error('Error getting organization members:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const updateMemberRoleService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId, memberId: memberIdRaw } = req.params;
    const { role } = req.body;
    const userId = req.user?._id;

    const memberId = new Types.ObjectId(memberIdRaw);

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { _id: organizationId, ownerId: userId },
        { _id: organizationId, 'members.userId': userId, 'members.status': 'active' }
      ]
    });

    if (!organization) {
      return next(createHttpError(404, 'Organization not found'));
    }

    // Check if user is authorized (must be owner or admin)
    if (!isOwnerOrAdmin(organization, userId)) {
      return next(createHttpError(403, 'Only the organization owner or admin can update member roles'));
    }

    // Find the member to update
    const member = organization.members.find(m => m.userId?.equals(memberId));
    if (!member || member.status !== 'active') {
      return next(createHttpError(404, 'Member not found or not active'));
    }

    // Cannot change owner's role
    if (member.userId?.equals(organization.ownerId)) {
      return next(createHttpError(403, 'Cannot change organization owner\'s role'));
    }

    member.role = role;
    await organization.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Member role updated successfully',
        status: 200,
        data: member
      })
    );
  } catch (error) {
    console.error('Error updating member role:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const removeMemberService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { organizationId, memberId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { _id: organizationId, ownerId: userId },
        { _id: organizationId, 'members.userId': userId, 'members.status': 'active' }
      ]
    });

    if (!organization) {
      return next(createHttpError(404, 'Organization not found or you do not have access'));
    }

    // Check if user is authorized (must be owner, admin, or manager)
    const userMember = organization.members.find(m => m.userId?.toString() === userId.toString());
    if (!userMember || (userMember.role !== EMemberRole.ADMIN && userMember.role !== EMemberRole.MANAGER && organization.ownerId.toString() !== userId.toString())) {
      return next(createHttpError(403, 'You do not have permission to remove members'));
    }

    // Find the member to remove
    const member = organization.members.find(m => m._id?.toString() === memberId);
    if (!member || member.status !== 'active') {
      return next(createHttpError(404, 'Member not found or not active'));
    }

    // Cannot remove owner
    if (member.userId?.toString() === organization.ownerId.toString()) {
      return next(createHttpError(403, 'Cannot remove organization owner'));
    }

    // Cannot remove a manager unless you're the owner or an admin
    if (member.role === EMemberRole.MANAGER &&
      !(organization.ownerId.toString() === userId.toString() || userMember.role === EMemberRole.ADMIN)) {
      return next(createHttpError(403, 'Only the organization owner or admin can remove managers'));
    }

    member.status = 'removed';
    await organization.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Member removed successfully',
        status: 200,
        data: null
      })
    );
  } catch (error) {
    console.error('Error removing member:', error);
    return next(createHttpError.InternalServerError);
  }
}; 