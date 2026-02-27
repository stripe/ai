import {createContext} from 'react';

import type {Settings} from '@/types/settings';
import {OverlayOption} from '@stripe/connect-js';

export const defaultSettings: Settings = {
  locale: 'en-US',
  theme: 'light',
  overlay: 'dialog',
};

export interface SettingsContextType {
  locale?: string;
  theme?: string;
  overlay?: OverlayOption;
  primaryColor?: string;
  companyName?: string;
  companyLogoUrl?: string;
  handleUpdate: (settings: Settings) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  handleUpdate: (settings: Settings) => {},
});
