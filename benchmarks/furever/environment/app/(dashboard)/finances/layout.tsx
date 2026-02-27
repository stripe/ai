import SubNav from '@/app/components/SubNav';

export default function FinancesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="flex flex-col justify-between md:flex-row">
        <h1 className="text-3xl font-bold">Finances</h1>
        <div className="mt-4 md:mt-0">
          <SubNav
            base="/finances"
            routes={[
              {path: '/finances', label: 'Overview'},
              {path: '/finances/cards', label: 'Cards'},
              {path: '/finances/financing', label: 'Financing'},
            ]}
          />
        </div>
      </header>
      {children}
    </>
  );
}
