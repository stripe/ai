import NextAuth, {DefaultSession} from 'next-auth';
import Stripe from 'stripe';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's Stripe account. */
      stripeAccount: Stripe.Account;
      businessName?: string | null;
      password?: string | null;
      setup?: boolean;
      changedPassword: boolean;

      // Custom branding options
      primaryColor?: string | null;
      companyName?: string | null;
      companyLogoUrl?: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      setup?: boolean | null;
    };
  }
}
