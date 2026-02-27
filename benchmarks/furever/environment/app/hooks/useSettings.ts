import {useContext} from 'react';
import {SettingsContext} from '@/app/contexts/settings';

export const useSettings = () => useContext(SettingsContext);
