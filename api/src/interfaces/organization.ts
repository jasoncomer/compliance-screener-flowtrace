import mongoose from 'mongoose';

export enum EMemberRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TEAM_MEMBER = 'team_member',
}
export type MemberRole = EMemberRole[keyof EMemberRole];

export interface IMember {
  _id?: mongoose.Types.ObjectId; // MongoDB document ID
  userId?: mongoose.Types.ObjectId; // Optional for pending invitations
  email?: string; // Email for pending invitations
  role: MemberRole;
  status: 'pending' | 'active' | 'removed';
  joinedAt: Date;
  invitedBy: mongoose.Types.ObjectId; // User ID who invited this member
}

interface IOrganizationSettings {
  maxMembers: number;
  allowedDomains: string[];
  inviteCode: string;
  allowCSAM: boolean;
  riskScoreThreshold: number;
  transactionThreshold: number;
}

export interface IOrganization {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  email: string; // Organization email address
  ownerId: mongoose.Types.ObjectId; // User ID of the organization owner
  members: IMember[];
  settings: IOrganizationSettings;
}

export interface IInvitation {
  id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  email: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: mongoose.Types.ObjectId; // User ID who created the invitation
  createdAt: Date;
  expiresAt: Date;
  inviteCode: string; // Unique code for this invitation
} 