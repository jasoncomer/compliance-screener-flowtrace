import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { checkOrganizationTierLimits } from '@src/services/subscription.service';

/**
 * Middleware to check if an organization has reached its tier limit for a specific feature
 * @param limitType - The type of limit to check
 * @returns A middleware function
 */
export const checkTierLimit = (limitType: 'maxMembers' | 'maxOrganizations' | 'maxTransactionsPerMonth') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId || req.body.organizationId;

      if (!organizationId) {
        return next(createHttpError(400, 'Organization ID is required'));
      }

      const { allowed, limit, current, tierName } = await checkOrganizationTierLimits(organizationId, limitType);

      if (!allowed) {
        return next(
          createHttpError(
            403,
            `Organization has reached its ${limitType} limit (${current}/${limit}) for the ${tierName} tier. Please upgrade your subscription.`
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 