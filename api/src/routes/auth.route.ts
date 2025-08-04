import express from 'express';

import {
  isAuth,
  loginUserValidation,
  refreshTokenValidation,
  resetPasswordValidation,
  sendVerificationMailValidation,
  signupUserValidation,
  verifyUserMailValidation,
  forgotPasswordValidation,
} from '@src/middlewares';
import {

  changePasswordController,
  loginController,
  logoutController,
  refreshTokenController,
  resetPasswordController,
  sendForgotPasswordMailController,
  signupController,
  verifyEmailController,
} from '@src/controllers';

const router = express.Router();

// used in app
router.post('/login', loginUserValidation, loginController);
router.post('/signup', signupUserValidation, signupController);

// not used in app
router.post('/logout', refreshTokenValidation, logoutController);
router.get('/verify-email/:userId/:token', verifyUserMailValidation, verifyEmailController);
router.post('/refresh-token', refreshTokenValidation, refreshTokenController);
router.post('/forget-password', forgotPasswordValidation, sendForgotPasswordMailController);
router.post('/reset-password/:userId/:token', resetPasswordValidation, resetPasswordController);
router.post('/change-password', isAuth, changePasswordController);

export = router;
