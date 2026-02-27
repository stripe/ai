import {EmbeddedComponentWrapper} from '@/app/hooks/EmbeddedComponentWrapper';

// This is the layout that we show to demonstrate onboarding
// a specific connected account
export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <EmbeddedComponentWrapper demoOnboarding={true}>
      {children}
    </EmbeddedComponentWrapper>
  );
}
