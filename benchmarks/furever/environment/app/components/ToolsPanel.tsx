'use client';

import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useSession} from 'next-auth/react';
import Stripe from '@/public/stripe-gray.svg';
import {
  Sparkles as SparklesIcon,
  File as FileIcon,
  PanelLeftClose,
  X,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radiogroup';
import {Sparkles} from 'lucide-react';
import {useEmbeddedComponentBorder} from '../hooks/EmbeddedComponentBorderProvider';
import {useToolsContext} from '../hooks/ToolsPanelProvider';
import * as React from 'react';
import LocaleSelector from './Tools/LocaleSelector';
import ThemePicker from './Tools/ThemePicker';
import OverlaySelector from './Tools/OverlaySelector';
import CreateInterventionsButton from './testdata/CreateInterventionsButton';
import CreatePayoutsButton from './testdata/CreatePayoutsButton';
import CreateFinancialCreditButton from './testdata/CreateFinancialCreditButton';
import CreateCheckoutSessionButton from './testdata/CreateCheckoutSessionButton';
import ManageFinancing from './testdata/Financing/ManageFinancing';
import BrandSettingsModal from './BrandSettingsModal';

const ToolsPanel = () => {
  const pathname = usePathname();
  const {data: session} = useSession();

  const stripeAccount = session?.user?.stripeAccount;

  const [showMobileNavItems, setShowMobileNavItems] = React.useState(false);
  const {handleEnableBorderChange, enableBorder} = useEmbeddedComponentBorder();
  const {handleOpenChange} = useToolsContext();
  const [border, setBorder] = React.useState(true);
  const [theme, setTheme] = React.useState('light');
  const [locale, setLocale] = React.useState('english');
  const [overlay, setOverlay] = React.useState('dialog');

  const actions = [
    {
      description: 'Create a checkout session',
      href: '/payments',
    },
    {
      description: 'Create a test payout',
      href: '/payouts',
      component: CreatePayoutsButton,
    },
    {
      description: 'Simulate a risk intervention',
      href: '/settings',
      component: CreateInterventionsButton,
    },
    {
      description: 'Create a Checkout Session',
      href: '/settings',
      component: CreateCheckoutSessionButton,
    },
    {
      description: 'Simulate a risk intervention',
      href: '/home',
      component: CreateInterventionsButton,
    },
    {
      description: 'Create a test financial credit',
      href: '/finances',
      component: CreateFinancialCreditButton,
    },
    {
      description: 'Manage Financing',
      href: '/finances',
      component: ManageFinancing,
    },
  ];

  const CustomTools = () => {
    return (
      <div className="mt-4 flex flex-col items-stretch gap-2">
        {actions.map(
          (action) =>
            pathname.includes(action.href) &&
            action.component && (
              // <Button
              //   className="my-1 rounded-lg border border-[#D8DEE4] bg-white py-1 text-sm font-medium shadow"
              //   variant="secondary"
              //   key={action.description}
              // >
              //   {action.description}
              // </Button>
              <action.component key={action.description} />
            )
        )}
      </div>
    );
  };

  const DefaultTools = () => {
    return (
      <div className="my-6 flex flex-col gap-y-4 text-lg font-medium">
        <div className="flex flex-row items-center justify-between rounded-lg">
          <Label className="text-left" htmlFor="outline">
            Component outlines
          </Label>
          <Switch
            className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-[#EBEEF1]"
            id="outline"
            checked={border}
            onCheckedChange={() => handleEnableBorderChange(!border)}
          />
        </div>
        <div className="flex flex-row items-center justify-between">
          <Label className="text-left" htmlFor="theme">
            Theme
          </Label>
          <ThemePicker />
        </div>
        <div className="flex flex-row items-center justify-between">
          <Label className="text-left align-middle" htmlFor="outline">
            Locale
          </Label>
          <LocaleSelector />
        </div>
        {/* <div className="flex flex-row justify-between">
          <Label className="text-left" htmlFor="outline">
            Overlay style
          </Label>
          <OverlaySelector />
        </div> */}
      </div>
    );
  };

  React.useEffect(() => {
    setBorder(enableBorder);
  }, [enableBorder]);

  return (
    <div className="flex h-full w-full flex-col justify-between bg-tools-background p-5">
      <Button
        variant="ghost"
        className="absolute right-4 top-4 px-2 md:hidden"
        onClick={() => handleOpenChange(false)}
      >
        <X size={20} />
      </Button>
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2 text-lg font-bold text-primary">
            <Sparkles size={20} />
            Tools
          </div>
          <BrandSettingsModal />
        </div>
        <DefaultTools />
        <hr />
        <div className="my-4 flex items-center gap-x-2 text-lg font-bold text-primary">
          <FileIcon size={20} />
          On this page
        </div>
        <CustomTools />
      </div>
      <div className="hidden justify-between md:flex">
        <Image src={Stripe} alt="stripe logo" height={24} />
        <Button
          variant="secondary"
          className="gap-1.5 px-3 py-2 text-sm"
          onClick={() => handleOpenChange(false)}
        >
          <PanelLeftClose size={20} />
          Close{' '}
        </Button>
      </div>
    </div>
  );
};

export default ToolsPanel;
