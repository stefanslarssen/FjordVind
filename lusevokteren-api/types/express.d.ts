// Express Request Extensions

import { JWTPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
