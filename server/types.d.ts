import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

declare module "express-serve-static-core" {
  interface Request {
    githubRepo?: any;
  }
}

// TypeScript declaration for passport-github2
declare module "passport-github2" {
  import { Strategy as PassportStrategy } from "passport";
  
  export interface Profile {
    id: string;
    username?: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    company?: string;
    _json: any;
  }
  
  export class Strategy extends PassportStrategy {
    constructor(
      options: {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
      },
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: any) => void
      ) => void
    );
  }
}