declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STRIPE_SECRET_KEY: string;
      STRIPE_PUBLISHABLE_KEY: string;
      APP_NAME: string;
      PORT: number;
      SECRET: string;
      MONGO_URI: string;
    }
  }
}

export {};
