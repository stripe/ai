import {Globe} from 'lucide-react';
import Container from '@/app/components/Container';
import LocaleSelector from '@/app/components/Tools/LocaleSelector';

const changeLocale = async () => {
  return [null, RenderActionMenu];
};

const RenderActionMenu = (exit: () => void, settings: any) => {
  return (
    <Container>
      <h1 className="text-lg font-bold">Set locale</h1>
      <LocaleSelector localeUpdated={exit} />
    </Container>
  );
};

const config = {
  name: 'Change locale',
  icon: Globe,
  description: 'Changes the browser locale.',
  action: changeLocale,
};

export default config;
