'use client';

import Dog from '@/public/landing-page.jpeg';
import FureverLogo from '@/public/furever_logo.png';
import Image from 'next/image';
import DogHug from '@/public/testimonial.jpeg';
import QuotePortrait from '@/public/testimonial-portrait.jpg';
import Dashboard from '@/public/dashboard.png';
import Stripe from '@/public/stripe.svg';
import {Button} from '@/components/ui/button';
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Quote,
  ReceiptText,
} from 'lucide-react';
import {useSession} from 'next-auth/react';
import Link from 'next/link';

function Card({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-[400px] flex-1 flex-col items-center rounded-lg border bg-white p-6 transition duration-150 hover:scale-[1.02] hover:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-subdued">
        {icon}
      </div>
      <p className="pt-4 text-center text-lg font-bold text-primary">{title}</p>
      <p className="text-center text-subdued">{description}</p>
    </div>
  );
}

const AuthButtons = () => {
  const {data: session, status} = useSession();

  if (status == 'authenticated') {
    let buttonLink = '/';
    let buttonText = '';

    if (session?.user?.stripeAccount?.details_submitted === false) {
      // Stripe account created but onboarding not complete
      buttonLink = '/onboarding';
      buttonText = 'Continue onboarding';
    } else if (session?.user?.stripeAccount == null) {
      // Stripe account not created
      buttonLink = '/business';
      buttonText = 'Continue onboarding';
    } else {
      buttonLink = '/home';
      buttonText = 'Go to dashboard';
    }

    return (
      <Link href={buttonLink}>
        <Button size="lg" className="items-center gap-x-1">
          {buttonText}
          <ArrowRight />
        </Button>
      </Link>
    );
  } else {
    return (
      <>
        <Link href="/login">
          <Button
            variant="secondary"
            className="bg-white"
            size="lg"
            data-testid="login-button"
          >
            Log in
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="lg" className="flex items-center gap-x-1">
            Get started
            <ArrowRight />
          </Button>
        </Link>
      </>
    );
  }
};

export default function LandingPage() {
  return (
    <div>
      <div className="relative">
        <div className="mx-auto flex max-w-screen-lg flex-col items-center px-4 pb-16 sm:pb-[140px]">
          <div className="flex w-full flex-row items-center justify-center gap-3 py-4">
            <Image
              src={FureverLogo}
              alt="Furever logo"
              height={48}
              width={48}
              sizes="92px"
              priority
            />
            <p className="text-2xl font-bold text-white">Furever</p>
          </div>

          <div className="max-w-[700px] py-8 sm:py-16">
            <h1 className="mb-1 text-center text-4xl font-bold leading-tight text-white drop-shadow sm:text-6xl">
              Manage your pet business with ease.
            </h1>
            <p className="pt-4 text-center text-xl text-white drop-shadow sm:text-[24px]">
              Furever is the world&apos;s leading pet grooming platform. Join
              our team of salons and expand your business.
            </p>
          </div>
          <div className="flex h-[52px] flex-row gap-x-4">
            <AuthButtons />
          </div>
        </div>
        <div className="absolute top-0 z-[-1] h-full w-full overflow-hidden bg-gradient-to-t from-black/70 to-black/40" />
        <Image
          src={Dog}
          alt="logo"
          placeholder="blur"
          quality={80}
          sizes="100vw"
          className="absolute top-0 z-[-2] h-full w-full overflow-hidden object-cover"
          priority
        />
      </div>

      {/* Features section */}
      <div className="relative bg-paw-pattern bg-[size:426px]">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center py-12 sm:py-20">
            <h3 className="text-lg font-bold text-accent">FEATURES</h3>
            <p className="mb-12 text-center text-3xl font-bold text-black">
              Everything you need to manage your pet business.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <Card
                icon={<CalendarCheck color="var(--accent)" />}
                title="Simple scheduling"
                description="Easily set up appointments, organize your calendar, and manage different salons."
              />
              <Card
                icon={<CreditCard color="var(--accent)" />}
                title="Accept payments"
                description="Take credit card and bank payments, track all your transactions, and get paid out faster."
              />
              <Card
                icon={<ReceiptText color="var(--accent)" />}
                title="Manage your finances"
                description="Get access to banking, instant financing, issue credit cards, and view transactions."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quote section */}
      <div className="relative bg-accent-subdued">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center gap-20 py-12 sm:py-20 md:flex-row">
            <Image
              src={DogHug}
              alt="hug dog"
              placeholder="blur"
              quality={100}
              sizes="100vw"
              className="w-full max-w-[450px] overflow-hidden rounded-xl object-cover shadow-lg"
            />
            <div className="flex flex-col gap-y-6">
              <p className="relative text-3xl font-bold text-black">
                “Furever has transformed the way we manage our salon! Booking
                and payments are seamless now, and our clients love the
                convenience!”
                <Quote
                  fill="var(--accent)"
                  strokeWidth={0}
                  size="120"
                  className="absolute right-4 top-[-50px] opacity-20 sm:right-[-20px]"
                />
              </p>
              <div className="flex flex-row items-center gap-x-5 self-end">
                <Image
                  src={QuotePortrait}
                  alt="portrait of person who gave the testimonial"
                  placeholder="blur"
                  quality={50}
                  sizes="100px"
                  className="h-12 w-12 overflow-hidden rounded-full object-cover shadow-lg"
                />
                <div>
                  <p className="text-xl font-bold text-accent">Jamie L.</p>
                  <p className="text-md text-secondary">Paws & Relax Spa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Get started section */}
      <div className="relative items-center bg-accent bg-paw-pattern-white bg-[size:426px]">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center gap-12 pb-40 pt-12 text-white sm:flex-row sm:pb-32 sm:pt-20">
            <div className="">
              <h2 className="mb-2 text-left text-4xl font-bold">
                Get started today.
              </h2>
              <p className="mb-6 text-left text-xl sm:text-2xl">
                Furever is the world&apos;s leading pet grooming platform. Join
                our team of salons and expand your business
              </p>
              <Link href="/signup">
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-1.5 text-primary"
                >
                  Get Started
                  <ArrowRight size={22} />
                </Button>
              </Link>
            </div>
            <div className="w-full overflow-hidden rounded-lg shadow-xl">
              <Image
                src={Dashboard}
                alt="A screenshot of Furever dashboard"
                sizes="50vw"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 right-[50%] flex w-full translate-x-2/4 flex-col gap-3 bg-gradient-to-tr from-[#9160F1] to-[#11DFD4] px-2 py-3 shadow-xl sm:bottom-5 sm:w-[calc(100%-24px)] sm:flex-row sm:rounded-lg sm:px-6 lg:w-[1000px]">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-6">
          <a href="https://stripe.com" target="_blank">
            <Image
              src={Stripe}
              alt="stripe logo"
              className="hidden max-h-[20px] sm:block"
              color="var(--accent)"
            />
          </a>
          <p className="text-sm text-white">
            This site is a demo for{' '}
            <a
              className="border-b border-white/60 text-white transition hover:border-white/90"
              href="https://docs.stripe.com/connect/get-started-connect-embedded-components"
              target="_blank"
            >
              Stripe Connect embedded components
            </a>
            . Furever is not a real product.
          </p>
        </div>
        <div className="flex justify-between">
          <a href="https://stripe.com" target="_blank">
            <Image
              src={Stripe}
              alt="stripe logo"
              className="max-h-[20px] sm:hidden"
              color="var(--accent)"
            />
          </a>
          <a
            className="flex items-center gap-1 text-sm font-medium text-white transition hover:opacity-80 sm:text-base"
            href="https://github.com/stripe/stripe-connect-furever-demo"
            target="_blank"
          >
            View on GitHub
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
