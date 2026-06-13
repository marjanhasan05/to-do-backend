import { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
