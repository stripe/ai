import Nav from '@/app/components/Nav';
import Container from '@/app/components/Container';
import {
  useToolsContext,
  ToolsPanelProvider,
} from '@/app/hooks/ToolsPanelProvider';
import ToolsPanel from '@/app/components/ToolsPanel';
// import OnboardingDialog from '../components/OnboardingDialog';
import {useSettings} from '../hooks/useSettings';

export default function Screen({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {open, handleOpenChange} = useToolsContext();
  const {theme} = useSettings();

  return (
    <div className="flex grow flex-row text-primary transition-colors">
      <div
        className={`h-full w-auto grow ${theme == 'light' ? 'bg-dot-grid bg-[size:224px]' : 'bg-dot-grid-dark bg-[size:224px]'}`}
      >
        {/* Tools Panel container */}
        <div
          className={`${open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:-translate-x-full md:translate-y-0'}
          fixed bottom-0 z-50 w-full overflow-hidden rounded-t-2xl bg-screen-foreground shadow-[0px_-4px_32px_rgba(0,0,0,0.15)] transition duration-500 ease-in-out md:h-screen md:w-[300px] md:rounded-none md:border-r md:shadow-none`}
        >
          <ToolsPanel />
        </div>

        {/* Furever site container */}
        <div
          className={`origin-left overflow-hidden transition duration-500 ease-in-out md:h-screen
            ${open ? 'shadow-xl md:translate-x-[calc(140px+22%)] md:scale-[0.6] md:rounded-xl md:border md:border-[1.5px] lg:translate-x-[calc(125px+19%)] lg:scale-[0.66] xl:translate-x-[calc(130px+15%)] xl:scale-[0.73]' : 'h-full min-h-screen w-full flex-col sm:flex-row'}
            ${theme == 'light' ? 'bg-paw-pattern bg-[size:426px]' : 'bg-screen-background'}`}
        >
          <Nav />
          <div className="mt-[74px] flex h-full grow justify-center overflow-scroll overscroll-contain p-3 pb-20 sm:ml-52 sm:mt-0 sm:mt-0 sm:p-8 lg:ml-64">
            <div className="mx-auto flex max-w-[1200px] grow flex-col gap-y-4 after:pb-8 md:gap-y-5">
              {/* <OnboardingDialog /> */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
