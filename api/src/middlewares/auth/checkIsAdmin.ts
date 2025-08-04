import { NextFunction, Response, Request } from 'express';
import createHttpError from 'http-errors';
import { IAuthRequest } from '@src/interfaces';


export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as IAuthRequest)?.user;
  const adminEmails = [
    'vicdaruf@yahoo.com',
    'bryan@blockscout.ai',
    'hwasoo@blockscout.ai',
    'jason@blockscout.ai',
    'jason@vpproperties.com',
    'gerardo@blockscout.ai',
  ];

  // TODO: Revisit this
  // const adminUser = user && user.role === authorizationRoles.admin && adminEmails?.includes(`${user?.email}`);
  const adminUser = user && adminEmails?.includes(`${user?.email}`);

  // TODO: ensure user email is verified

  if (!adminUser) {
    return next(createHttpError(403, `Auth Failed (Unauthorized)`));
  }

  next();
};

export default { isAdmin };
