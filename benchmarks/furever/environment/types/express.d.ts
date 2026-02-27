import express from 'express';

declare global {
  namespace Express {
    export interface User {
      salon: {
        license: string;
        name: string;
        specialty: string;
      };
      type: 'individual' | 'company';
      country: string;
      id: string;
      email: string;
      password: string;
      created: Date;
      firstName: string;
      lastName: string;
      stripeAccountId: string;
      businessName: string;
      setup: boolean;
      quickstartAccount: boolean;
      changedPassword: boolean;
      primaryColor: string;
      companyName: string;
      companyLogoUrl: string;

      // MongoDB methods
      isModified: (field: string) => boolean;
      isNew: boolean;
      generateHash: (password: string) => string;
      save: () => Promise<Express.User>;
      set: (body: Record<string, string>) => void;
    }
    export interface Request {
      body: Record<string, string>;
      user?: User;
    }
  }
}
