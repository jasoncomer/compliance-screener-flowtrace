import Joi from 'joi';
// @ts-ignore
import JoiObjectId from 'joi-objectid';

const vaildObjectId = JoiObjectId(Joi);

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 25;
const PASSWORD_MIN_LENGTH = 6;

export const userSchema = {
  signupUser: Joi.object({
    name: Joi.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).required(),
    surname: Joi.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
    // confirmPassword: Joi.string().required().valid(Joi.ref('password')),
  }),
  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
  }),
  updateUser: Joi.object({
    userId: vaildObjectId().required(),
    name: Joi.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    surname: Joi.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    email: Joi.string().email(),
    mobileNumber: Joi.string(),
    isVerified: Joi.boolean(),
    isDeleted: Joi.boolean(),
    status: Joi.string(),
    confirmationCode: Joi.string(),
  }),
  verifyUserMail: Joi.object({
    token: Joi.string().min(3).max(300).required(),
    userId: vaildObjectId().required(),
  }),
  refreshToken: Joi.object({
    refreshToken: Joi.string().min(3).max(300).required(),
  }),
  sendVerificationMail: Joi.object({
    email: Joi.string().email().required(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    token: Joi.string().min(3).max(300).required(),
    userId: vaildObjectId().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')),
  }),
  validatedUserId: Joi.object({
    userId: vaildObjectId().required(),
  }),
};

export default userSchema;
