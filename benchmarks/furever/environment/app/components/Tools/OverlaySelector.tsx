import {useContext, useCallback} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {SettingsContext} from '@/app/contexts/settings';
import {OverlayOption} from '@stripe/connect-js';

const Overlays: Array<{overlayType: OverlayOption; label: string}> = [
  {label: 'Dialog', overlayType: 'dialog'},
  {label: 'Drawer', overlayType: 'drawer'},
];

const OverlaySelector = () => {
  const settings = useContext(SettingsContext);

  const setOverlay = useCallback(
    (value: OverlayOption) => {
      settings.handleUpdate({overlay: value});
    },
    [settings]
  );

  const overlay =
    Overlays.find((o) => o.overlayType === settings.overlay) || Overlays[0]!;

  return (
    <Select onValueChange={(value) => setOverlay(value as OverlayOption)}>
      <SelectTrigger className="w-[120px]">
        <SelectValue>{overlay.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dialog">Dialog</SelectItem>
        <SelectItem value="drawer">Drawer</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default OverlaySelector;
