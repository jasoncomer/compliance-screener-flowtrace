import { Schema, Document, Model } from 'mongoose';
import { IOrganization, IMember, MemberRole, EMemberRole } from '@src/interfaces/organization';

export interface IOrganizationDocument extends Omit<IOrganization, '_id'>, Document {
  generateInviteCode(): Promise<string>;
}

interface IOrganizationModel extends Model<IOrganizationDocument> {
  canUserCreateOrganization(userId: string): Promise<boolean>;
}

const MemberSchema = new Schema<IMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  role: {
    type: String,
    enum: [EMemberRole.MANAGER, EMemberRole.TEAM_MEMBER, EMemberRole.ADMIN] as MemberRole[],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'removed'],
    default: 'active',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: false
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
});

export const OrganizationSchema = new Schema<IOrganizationDocument, IOrganizationModel>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minLength: [2, "Name can't be smaller than 2 characters"],
      maxLength: [50, "Name can't be greater than 50 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Description can't be greater than 500 characters"]
    },
    email: {
      type: String,
      required: [true, 'Organization email is required'],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      trim: true,
      lowercase: true,
      maxLength: [128, "Email can't be greater than 128 characters"],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization owner is required']
    },
    members: [MemberSchema],
    settings: {
      maxMembers: {
        type: Number,
        default: 10,
        min: [1, 'Maximum members must be at least 1'],
        max: [100, 'Maximum members cannot exceed 100']
      },
      allowedDomains: [{
        type: String,
        trim: true,
        lowercase: true
      }],
      inviteCode: {
        type: String,
        unique: true,
        sparse: true
      },
      allowCSAM: {
        type: Boolean,
        default: false,
      },
      riskScoreThreshold: {
        type: Number,
        default: 0,
        min: [0, 'Risk score threshold must be at least 0'],
        max: [100, 'Risk score threshold cannot exceed 100']
      },
      transactionThreshold: {
        type: Number,
        default: 0,
        min: [0, 'Transaction threshold must be at least 0'],
        max: [1000000, 'Transaction threshold cannot exceed 1,000,000']
      }
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ 'members.userId': 1 });
OrganizationSchema.index({ 'settings.inviteCode': 1 });

// Static method to check if a user can create more organizations
OrganizationSchema.static('canUserCreateOrganization', async function (userId: string): Promise<boolean> {
  const count = await this.countDocuments({ ownerId: userId });
  return count < 5; // Max 5 organizations per user
});

// Method to generate a unique invite code
OrganizationSchema.method('generateInviteCode', async function (): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const exists = await (this.constructor as IOrganizationModel).findOne({ 'settings.inviteCode': code });
  if (exists) {
    return this.generateInviteCode();
  }
  return code;
}); 