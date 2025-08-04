import { IOrganization } from './organization';
import { IAuthRequest } from './User';

export interface IAuthOrgRequest extends IAuthRequest {
  organization?: IOrganization;
}