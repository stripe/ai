import {useEffect, useMemo, useState, useCallback} from 'react';
import {type StripeConnectInstance} from '@stripe/connect-js';
import {loadConnectAndInitialize} from '@stripe/connect-js';
import {useSettings} from '@/app/hooks/useSettings';
import {
  defaultPrimaryColor,
} from '@/app/contexts/themes/ThemeConstants';

export const useConnect = (demoOnboarding: boolean) => {
  const [hasError, setHasError] = useState(false);
  const [stripeConnectInstance, setStripeConnectInstance] =
    useState<StripeConnectInstance | null>(null);
  const [isClient, setIsClient] = useState(false);

  const settings = useSettings();
  const locale = settings.locale;
  const theme = settings.theme;
  const primaryColor = settings.primaryColor || defaultPrimaryColor;
  const [localTheme, setTheme] = useState(settings.theme);

  const [localLocale, setLocalLocale] = useState(settings.locale);

  useEffect(() => {
    if (locale === localLocale) {
      return;
    }

    let newAccountSessionRequired: boolean = false;

    switch (locale) {
      case 'fr-FR':
        newAccountSessionRequired = true;
        break;
      case 'zh-Hant-HK':
      case 'en-GB':
        if (localLocale === 'zh-Hant-HK' || localLocale === 'en-GB') {
          // No need to get a new account session here
        } else {
          newAccountSessionRequired = true;
        }
        break;
      default:
        if (
          localLocale &&
          ['fr-FR', 'zh-Hant-HK', 'en-GB'].includes(localLocale)
        ) {
          // We need a new account session
          newAccountSessionRequired = true;
        }

        break;
    }

    if (locale !== localLocale) {
      setLocalLocale(locale);
    }

    if (theme !== localTheme) {
      setTheme(theme);
    }

    if (demoOnboarding && newAccountSessionRequired) {
      setStripeConnectInstance(null);
    }
  }, [locale, localLocale, demoOnboarding, theme, localTheme]);

  const fetchClientSecret = useCallback(async () => {
    if (demoOnboarding) {
      console.log('Fetching client secret for demo onboarding');
    }
    const data = demoOnboarding
      ? {
          demoOnboarding: true,
          locale,
        }
      : {};

    // Fetch the AccountSession client secret
    const response = await fetch('/api/account_session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      // Handle errors on the client side here
      const {error} = await response.json();
      console.warn('An error occurred: ', error);
      setHasError(true);
      return undefined;
    } else {
      const {client_secret: clientSecret} = await response.json();
      setHasError(false);
      return clientSecret;
    }
  }, [demoOnboarding, locale]);

  // Effect to detect client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run ConnectJS initialization on the client side
    if (!isClient) {
      return;
    }

    if (!stripeConnectInstance) {
      try {
        const instance = loadConnectAndInitialize({
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!,
          locale,
          fetchClientSecret: async () => {
            return await fetchClientSecret();
          },
          metaOptions: {
            flagOverrides: {
              // Hide testmode stuff
              enable_sessions_demo: true,
            },
          },
        } as any);

        setStripeConnectInstance(instance);
      } catch (error) {
        console.error('Failed to initialize ConnectJS:', error);
        setHasError(true);
      }
    }
  }, [
    isClient,
    stripeConnectInstance,
    locale,
    fetchClientSecret,
    demoOnboarding,
  ]);

  return {
    hasError,
    stripeConnectInstance,
  };
};
