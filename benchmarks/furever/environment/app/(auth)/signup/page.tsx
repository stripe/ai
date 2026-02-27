import Link from 'next/link';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Sparkles, KeyRound, Pencil} from 'lucide-react';
import Form from './form';
import QuickstartButton from '@/app/components/QuickstartButton';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';

export default async function Signup() {
  const session = await getServerSession();

  if (session) {
    redirect('/home');
  }

  return (
    <>
      <div className="flex flex-col gap-y-[16px] text-primary">
        <h1 className="mb-1 text-2xl font-semibold">Get started</h1>
        <Tabs
          defaultValue="quickstart"
          className="w-full text-primary data-[state=active]:text-primary"
        >
          <TabsList className="mb-4 w-full data-[state=active]:text-primary">
            <TabsTrigger
              className="flex-1 data-[state=active]:text-primary"
              value="quickstart"
            >
              Quickstart
            </TabsTrigger>
            <TabsTrigger
              className="flex-1 data-[state=active]:text-primary"
              value="create"
            >
              Create an account
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Form />
          </TabsContent>
          <TabsContent
            value="quickstart"
            className="flex flex-col gap-5 text-primary"
          >
            <div className="flex gap-3">
              <Sparkles size={24} color="var(--primary)" />
              <p className="flex-1">
                Skip account onboarding and go straight to dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <KeyRound size={24} color="var(--primary)" />
              <p className="flex-1">
                A random username and password will be chosen for you.
              </p>
            </div>
            <div className="flex gap-3">
              <Pencil size={24} color="var(--primary)" />
              <p className="flex-1">
                You can update the username and password to something memorable.
              </p>
            </div>
            <QuickstartButton />
          </TabsContent>
        </Tabs>
      </div>
      <div className="mt-6 text-subdued">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent">
          Log in
        </Link>
      </div>
    </>
  );
}
