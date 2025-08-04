import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import {
  getSubscriptionTiersService,
  getOrganizationSubscriptionService,
  createOrganizationSubscriptionService,
  updateOrganizationSubscriptionService,
  cancelOrganizationSubscriptionService,
  SubscriptionError,
  SubscriptionNotFoundError,
  TierNotFoundError,
  DuplicateSubscriptionError,
} from '@src/services/subscription.service';
import { customResponse } from '@src/utils';

/**
 * Maps domain errors to HTTP errors
 */
const handleSubscriptionError = (error: unknown, next: NextFunction) => {
  if (error instanceof SubscriptionNotFoundError) {
    return next(createHttpError(404, error.message));
  } else if (error instanceof TierNotFoundError) {
    return next(createHttpError(404, error.message));
  } else if (error instanceof DuplicateSubscriptionError) {
    return next(createHttpError(400, error.message));
  } else if (error instanceof SubscriptionError) {
    return next(createHttpError(500, error.message));
  } else {
    return next(createHttpError.InternalServerError());
  }
};

/**
 * Get all subscription tiers
 */
export const getSubscriptionTiersController = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = await getSubscriptionTiersService();
    return res.status(200).send(
      customResponse({
        success: true,
        error: false,
        message: 'Subscription tiers retrieved successfully',
        status: 200,
        data: tiers,
      })
    );
  } catch (error) {
    return handleSubscriptionError(error, next);
  }
};

/**
 * Get organization subscription
 */
export const getOrganizationSubscriptionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const subscription = await getOrganizationSubscriptionService(organizationId);
    return res.status(200).send(
      customResponse({
        success: true,
        error: false,
        message: 'Organization subscription retrieved successfully',
        status: 200,
        data: subscription,
      })
    );
  } catch (error) {
    return handleSubscriptionError(error, next);
  }
};

/**
 * Create a subscription for an organization
 */
export const createOrganizationSubscriptionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, tierId, billingPeriod } = req.body;
    const subscription = await createOrganizationSubscriptionService({ organizationId, tierId, billingPeriod });
    return res.status(201).send(
      customResponse({
        success: true,
        error: false,
        message: 'Organization subscription created successfully',
        status: 201,
        data: subscription,
      })
    );
  } catch (error) {
    return handleSubscriptionError(error, next);
  }
};

/**
 * Update an organization's subscription
 */
export const updateOrganizationSubscriptionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.params;
    const { tierId, billingPeriod } = req.body;
    const subscription = await updateOrganizationSubscriptionService(organizationId, { tierId, billingPeriod });
    return res.status(200).send(
      customResponse({
        success: true,
        error: false,
        message: 'Organization subscription updated successfully',
        status: 200,
        data: subscription,
      })
    );
  } catch (error) {
    return handleSubscriptionError(error, next);
  }
};

/**
 * Cancel an organization's subscription
 */
export const cancelOrganizationSubscriptionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.params;
    const { cancelImmediately = false } = req.body;
    const result = await cancelOrganizationSubscriptionService(organizationId, { cancelImmediately });
    return res.status(200).send(
      customResponse({
        success: true,
        error: false,
        message: result.message,
        status: 200,
        data: result.subscription,
      })
    );
  } catch (error) {
    return handleSubscriptionError(error, next);
  }
}; 