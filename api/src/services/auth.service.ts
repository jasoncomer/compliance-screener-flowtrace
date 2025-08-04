import { NextFunction, Request, RequestHandler, Response } from 'express';
import createHttpError from 'http-errors';
import { SignOptions } from 'jsonwebtoken';

import { Schema } from 'mongoose';
import { environmentConfig } from '@src/configs/custom-environment-variables.config';

import {
  customResponse,
  sendConfirmResetPasswordEmail,
  sendEmailVerificationEmail,
  sendResetPasswordEmail,
  sendNewUserRegistrationNotification,
} from '@src/utils';
import { IAuthRequest, ResponseT } from '@src/interfaces';
import { verifyRefreshToken } from '@src/middlewares';
import { modelFactory } from '@src/db/modelFactory';

const whiteListedEmails = [
  'contact@verifiwallet.com',
  'ira@blockchainunmasked.com',
  'hazael@blockchainunmasked.com',
];

export const signupService = async (req: Request, res: Response<ResponseT<null>>, next: NextFunction) => {
  const { email, password, name, surname } = req.body;

  try {
    const User = await modelFactory.getModel('User');

    if (!whiteListedEmails.includes(email) && !email.includes('blockscout.ai')) {
      return next(createHttpError(403, `E-Mail address ${email} is not allowed.`));
    }

    const emailExists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (emailExists) {
      return next(createHttpError(500, `INTERNAL_SERVER_ERROR`));
      // return next(createHttpError(409, `E-Mail address ${email} is already exists, please pick a different one.`));
    }

    const newUser = new User({
      email,
      password,
      name,
      surname,
      confirmPassword: password,
    });

    const Organization = await modelFactory.getModel('Organization');
    const organization = new Organization({
      name: 'Default Organization',
      email: email, // Set organization email to owner's email by default
      ownerId: newUser._id,
      members: [],
      settings: {},
    });
    await organization.save();

    const user = await newUser.save();

    // Send Slack notification about new user registration
    await sendNewUserRegistrationNotification({
      email: user.email,
      name: user.name,
      surname: user.surname,
      _id: user._id.toString(),
    }).catch(error => {
      // Just log the error, don't interrupt the signup process
      console.error('Failed to send Slack notification:', error);
    });

    const Token = await modelFactory.getModel('Token');
    let token = await new Token({ userId: user._id });

    const payload = {
      userId: user._id,
    };

    const accessTokenSecretKey = environmentConfig.ACCESS_TOKEN_SECRET_KEY as string;
    const accessTokenOptions: SignOptions = {
      expiresIn: environmentConfig.ACCESS_TOKEN_KEY_EXPIRE_TIME,
      issuer: environmentConfig.JWT_ISSUER,
      audience: String(user._id),
    };

    const refreshTokenSecretKey = environmentConfig.REFRESH_TOKEN_SECRET_KEY as string;
    const refreshTokenJwtOptions: SignOptions = {
      expiresIn: environmentConfig.REFRESH_TOKEN_KEY_EXPIRE_TIME,
      issuer: environmentConfig.JWT_ISSUER,
      audience: String(user._id),
    };

    // Generate and set verify email token
    const generatedAccessToken = await token.generateToken(payload, accessTokenSecretKey, accessTokenOptions);
    const generatedRefreshToken = await token.generateToken(payload, refreshTokenSecretKey, refreshTokenJwtOptions);

    // Save the updated token
    token.refreshToken = generatedRefreshToken;
    token.accessToken = generatedAccessToken;
    token = await token.save();

    const verifyEmailLink = `${environmentConfig.WEBSITE_URL}/verify-email?id=${user._id}&token=${token.refreshToken}`;

    // send mail for email verification
    await sendEmailVerificationEmail(email, name, verifyEmailLink);

    const data = {
      user: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        verifyEmailLink,
      },
    };

    return res.status(201).json(
      customResponse<any>({
        data,
        success: true,
        error: false,
        message: `Auth Signup is success. An Email with Verification link has been sent to your account ${user.email} Please Verify Your Email first or use the email verification lik which is been send with the response body to verfiy your email`,
        status: 201,
      })
    );
  } catch (error: any) {
    return next(createHttpError.InternalServerError);
  }
};

export const loginService = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const User = await modelFactory.getModel('User');
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') })
      .select('+password')
      .exec();

    // 400 Bad Request for invalid credentials (do not use 401)
    if (!user) {
      return next(createHttpError(400, 'Auth Failed (Invalid Credentials)'));
    }

    // Compare password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(createHttpError(400, 'Auth Failed (Invalid Credentials)'));
    }

    const Token = await modelFactory.getModel('Token');
    let token = await Token.findOne({ userId: user._id });

    if (!token) {
      token = await new Token({ userId: user._id });
      token = await token.save();
    }

    const generatedAccessToken = await token.generateToken(
      {
        userId: user._id,
      },
      environmentConfig.ACCESS_TOKEN_SECRET_KEY as string,
      {
        expiresIn: environmentConfig.ACCESS_TOKEN_KEY_EXPIRE_TIME,
        issuer: environmentConfig.JWT_ISSUER,
        audience: String(user._id),
      }
    );
    const generatedRefreshToken = await token.generateToken(
      {
        userId: user._id,
      },
      environmentConfig.REFRESH_TOKEN_SECRET_KEY as string,
      {
        expiresIn: environmentConfig.REFRESH_TOKEN_KEY_EXPIRE_TIME,
        issuer: environmentConfig.JWT_ISSUER,
        audience: String(user._id),
      }
    );

    // Save the updated token
    token.refreshToken = generatedRefreshToken;
    token.accessToken = generatedAccessToken;
    token = await token.save();

    // check user is verified or not
    if (!user.isVerified || user.status !== 'active') {
      const verifyEmailLink = `${environmentConfig.WEBSITE_URL}/verify-email?id=${user._id}&token=${token.refreshToken}`;

      // Again send verification email
      sendEmailVerificationEmail(email, user.name, verifyEmailLink);

      const responseData = {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        verifyEmailLink,
      };

      return res.status(401).json(
        customResponse<typeof responseData>({
          data: responseData,
          success: false,
          error: true,
          message: `Your Email has not been verified. An Email with Verification link has been sent to your account ${user.email} Please Verify Your Email first or use the email verification lik which is been send with the response to verfiy your email`,
          status: 401,
        })
      );
    }

    // Convert mongoose document to plain object and remove sensitive fields
    const userObject = user.toObject();
    const { password: pass, confirmPassword, isVerified, isDeleted, status, acceptTerms, __v, ...otherUserInfo } = userObject;

    const data = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      user: otherUserInfo,
    };

    // Set cookies
    res.cookie('accessToken', token.accessToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // one days
      secure: process.env.NODE_ENV === 'production',
    });

    res.cookie('refreshToken', token.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
    });

    // Set refreshToken' AND accessToken IN cookies
    return res.status(200).json(
      customResponse<typeof data>({
        success: true,
        error: false,
        message: 'Auth logged in successful.',
        status: 200,
        data,
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const verifyEmailService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const User = await modelFactory.getModel('User');
    const user = await User.findById((req as any).params.userId);
    if (!user)
      return next(
        createHttpError(
          400,
          'Email verification token is invalid or has expired. Please click on resend for verify your Email.'
        )
      );

    // user is already verified
    if (user.isVerified && user.status === 'active') {
      return res.status(200).send(
        customResponse({
          data: null,
          success: true,
          error: false,
          message: `Your email has already been verified. Please Login..`,
          status: 200,
        })
      );
    }

    const Token = await modelFactory.getModel('Token');
    const emailVerificationToken = await Token.findOne({
      userId: user._id,
      refreshToken: (req as any).params.token,
    });

    if (!emailVerificationToken) {
      return next(createHttpError(400, 'Email verification token is invalid or has expired.'));
    }
    // Verfiy the user
    user.isVerified = true;
    user.status = 'active';

    await user.save();
    await emailVerificationToken.delete();

    return res.status(200).json(
      customResponse({
        data: null,
        success: true,
        error: false,
        message: 'Your account has been successfully verified . Please Login. ',
        status: 200,
      })
    );
  } catch (error) {
    return next(createHttpError.InternalServerError);
  }
};

export const logoutService: RequestHandler = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    const Token = await modelFactory.getModel('Token');
    const token = await Token.findOne({
      refreshToken,
    });

    if (!token) {
      return next(new createHttpError.BadRequest());
    }

    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      return next(new createHttpError.BadRequest());
    }

    // Clear Token
    await Token.deleteOne({
      refreshToken,
    });

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json(
      customResponse({
        data: null,
        success: true,
        error: false,
        message: 'Successfully logged out 😏 🍀',
        status: 200,
      })
    );
  } catch (error) {
    return next(createHttpError.InternalServerError);
  }
};

export const refreshTokenService: RequestHandler = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    const Token = await modelFactory.getModel('Token');
    let token = await Token.findOne({
      refreshToken,
    });

    if (!token) {
      return next(new createHttpError.BadRequest());
    }

    const rawUserId = await verifyRefreshToken(refreshToken);

    if (!rawUserId) {
      return next(new createHttpError.BadRequest());
    }

    const userId = new Schema.Types.ObjectId(rawUserId);
    const generatedAccessToken = await token.generateToken(
      {
        userId,
      },
      environmentConfig.ACCESS_TOKEN_SECRET_KEY as string,
      {
        expiresIn: environmentConfig.ACCESS_TOKEN_KEY_EXPIRE_TIME,
        issuer: environmentConfig.JWT_ISSUER,
        audience: String(userId),
      }
    );
    const generatedRefreshToken = await token.generateToken(
      {
        userId,
      },
      environmentConfig.REFRESH_TOKEN_SECRET_KEY as string,
      {
        expiresIn: environmentConfig.REFRESH_TOKEN_KEY_EXPIRE_TIME,
        issuer: environmentConfig.JWT_ISSUER,
        audience: String(userId),
      }
    );

    // Save the updated token
    token.refreshToken = generatedRefreshToken;
    token.accessToken = generatedAccessToken;
    token = await token.save();

    // Response data
    const data = {
      user: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
    };

    // Set cookies
    res.cookie('accessToken', token.accessToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // one days
      secure: process.env.NODE_ENV === 'production',
    });

    res.cookie('refreshToken', token.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
    });

    // Set refreshToken' AND accessToken IN cookies
    return res.status(200).json(
      customResponse<typeof data>({
        data,
        success: true,
        error: false,
        message: 'Auth logged in successful.',
        status: 200,
      })
    );
  } catch (error) {
    return next(createHttpError.InternalServerError);
  }
};

export const sendForgotPasswordMailService: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  console.log('\n=== Debug: Password Reset Request ===');
  console.log('Email:', email);

  try {
    const User = await modelFactory.getModel('User');
    const user = await User.findOne({ email });
    console.log('User found:', !!user);

    if (!user) {
      const message = `The email address ${email} is not associated with any account. Double-check your email address and try again.`;
      return next(createHttpError(401, message));
    }

    const Token = await modelFactory.getModel('Token');
    let token = await Token.findOne({ userId: user._id });
    console.log('Existing token found:', !!token);

    if (!token) {
      token = await new Token({ userId: user._id });
    }

    // Generate password reset token
    token.generatePasswordReset();
    token = await token.save();
    console.log('Reset token generated and saved');

    const passwordResetEmailLink = `${environmentConfig.WEBSITE_URL}/reset-password?id=${user._id}&token=${token.resetPasswordToken}`;
    console.log('Reset link:', passwordResetEmailLink);

    // Send password reset email
    console.log('Attempting to send reset email...');
    await sendResetPasswordEmail(email, user.name, passwordResetEmailLink);
    console.log('Reset email function completed');

    return res.status(200).json(
      customResponse<null>({
        data: null,
        success: true,
        error: false,
        message: `Password reset instructions have been sent to ${email} Please check your email.`,
        status: 200,
      })
    );
  } catch (error) {
    console.error('Error in sendForgotPasswordMailService:', error);
    return next(createHttpError.InternalServerError);
  }
};

export const resetPasswordService: RequestHandler = async (req, res, next) => {
  try {
    const User = await modelFactory.getModel('User');
    const user = await User.findById((req as any).params.userId);
    if (!user) return next(createHttpError(401, `Password reset token is invalid or has expired.`));

    if ((req as any).body.password !== (req as any).body.confirmPassword) {
      return next(createHttpError(400, 'Password and Confirm Password does not match.'));
    }

    const Token = await modelFactory.getModel('Token');
    const token = await Token.findOne({
      userId: (req as any).params.userId,
      resetPasswordToken: (req as any).params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!token) return next(createHttpError(401, 'Password reset token is invalid or has expired.'));

    user.password = (req as any).body.password;
    user.confirmPassword = (req as any).body.confirmPassword;
    await user.save();

    // Clear the reset token
    token.resetPasswordToken = undefined;
    token.resetPasswordExpires = undefined;
    await token.save();

    const confirmResetPasswordEmailLink = `${environmentConfig.WEBSITE_URL}/login`;

    await sendConfirmResetPasswordEmail(user.email, user.name, confirmResetPasswordEmailLink);

    return res.status(200).json(
      customResponse<null>({
        success: true,
        error: false,
        message: `Your password has been successfully reset. Please login with your new password.`,
        status: 200,
        data: null
      })
    );
  } catch (error) {
    return next(createHttpError.InternalServerError);
  }
};

export const changePasswordService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const User = await modelFactory.getModel('User');
    const user = await User.findById((req as IAuthRequest).user?._id).select('+password');

    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    const { currentPassword, newPassword } = (req as any).body;

    if (!currentPassword || !newPassword) {
      return next(createHttpError(400, 'Current password and new password are required'));
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return next(createHttpError(401, 'Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    user.confirmPassword = newPassword; // Also update confirmPassword to match

    await user.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Password updated successfully',
        status: 200,
        data: null
      })
    );
  } catch (error) {
    console.error('Error in changePasswordService:', error);
    return next(createHttpError.InternalServerError);
  }
};