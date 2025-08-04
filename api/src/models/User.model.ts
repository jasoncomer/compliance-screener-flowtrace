import bcrypt from 'bcrypt';
import { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';

import { environmentConfig } from '@src/configs/custom-environment-variables.config';
import { IUser } from '@src/interfaces';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  // document level operations
  comparePassword(password: string): Promise<boolean>;
  createJWT(): Promise<void>;
}

export const UserSchema: Schema<IUserDocument> = new Schema(
  {
    name: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Please provide name'],
      minLength: [3, "Name can't be smaller than 3 characters"],
      maxLength: [15, "Name can't be greater than 15 characters"],
    },
    surname: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Please provide surname'],
      minLength: [3, "Surname can't be smaller than 3 characters"],
      maxLength: [15, "Surname can't be greater than 15 characters"],
    },
    email: {
      type: String,
      required: [true, 'Please provide email'],
      // a regular expression to validate an email address(stackoverflow)
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      unique: false,
      trim: true,
      lowercase: true,
      maxLength: [128, "Email can't be greater than 128 characters"],
      index: false,
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: [6, 'Password must be more than 6 characters'],
      trim: true,
      select: false,
    },
    confirmPassword: {
      type: String,
      required: [true, 'Please provide confirmed Password'],
      minlength: [6, 'Password must be more than 6 characters'],
      trim: true,
      select: false,
    },

    mobileNumber: {
      type: String,
      required: false,
      maxLength: [18, "mobileNumber can't be greater than 18 characters"],
      // match: [/^(\+\d{1,3}[- ]?)?\d{10}$/, 'Please provide a valid number'],
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'active',
      required: false,
      trim: true,
      lowercase: true,
    },
    confirmationCode: { type: String, require: false, index: true, unique: true, sparse: true },
    resetPasswordToken: {
      type: String,
      required: false,
    },
    resetPasswordExpires: {
      type: Date,
      required: false,
    },
    settings: {
      type: Object,
      required: false,
      default: {
        showRealCSAMEntityNames: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

UserSchema.pre('save', async function (next) {
  if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
    console.log('Middleware called before saving the user is', this);
  }

  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;
  if (user.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
    user.confirmPassword = await bcrypt.hash(user.password, salt);
  }
  next();
});

UserSchema.post('save', function () {
  if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
    console.log('Middleware called after saving the user is (User is been Save )', this);
  }
});

UserSchema.methods.createJWT = function () {
  const payload = {
    userId: this._id,
    email: this.email,
    name: this.firstName,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    role: this.role,
  };

  return jwt.sign(payload, environmentConfig.TOKEN_SECRET as string, {
    expiresIn: environmentConfig.JWT_EXPIRE_TIME,
  });
};

// export default models.User || mongoose.connection.useDb('blockscout-db').model<IUserDocument>('User', UserSchema);
