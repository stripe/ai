import {useContext, useCallback} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {LocaleType, Locales} from '@/types/settings';
import {SettingsContext} from '@/app/contexts/settings';

type LocaleProps = {
  localeUpdated?: () => void;
};

const LocaleSelector = ({localeUpdated}: LocaleProps) => {
  const settings = useContext(SettingsContext);

  const setLocale = useCallback(
    (value: string) => {
      const locale = Locales.find((l) => `${l.locale}-${l.label}` === value);
      if (!locale) {
        return;
      }

      settings.handleUpdate({locale: locale.locale});
      if (localeUpdated) {
        localeUpdated();
      }
    },
    [localeUpdated, settings]
  );

  // Find the locale display name
  const locale =
    Locales.find((l) => l.locale === settings.locale) || Locales[0]!;

  return (
    <Select value={locale.locale} onValueChange={setLocale}>
      <SelectTrigger className="w-[162px] text-xs">
        <SelectValue className="text-xs" placeholder="Locale">
          {locale.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[130] text-xs">
        {Locales.map((locale, index) => (
          <SelectItem value={`${locale.locale}-${locale.label}`} key={index}>
            {locale.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LocaleSelector;
