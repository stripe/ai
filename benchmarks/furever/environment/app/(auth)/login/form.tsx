'use client';

import * as React from 'react';
import {signIn} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {ArrowRight, Loader2} from 'lucide-react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {UserFormSchema} from '@/lib/forms';

export default function LoginForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof UserFormSchema>>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof UserFormSchema>) => {
    try {
      const result = await signIn('login', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        form.setError('root', {
          type: 'manual',
          message: 'Invalid email or password. Please try again.',
        });
      } else if (result?.ok) {
        router.push('/home');
      }
    } catch (error: any) {
      console.error('An error occurred when signing in', error);
      form.setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 space-y-4">
        <div className="flex flex-col space-y-2">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    autoFocus
                    className="rounded-md border border-gray-300 p-2 placeholder:text-gray-400"
                    placeholder="jenny.rosen@example.com"
                    data-testid="email-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col space-y-1 pb-3">
          <FormField
            control={form.control}
            name="password"
            render={({field}) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    className="rounded-md border border-gray-300 p-2 placeholder:text-gray-400"
                    placeholder="••••••••"
                    type="password"
                    data-testid="password-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          data-testid="submit-login-button"
          className={'w-full rounded-md bg-accent p-2 font-bold text-white'}
        >
          {!form.formState.isSubmitting && (
            <div className="flex flex-row gap-x-[6px] text-base font-medium">
              <p>Log in</p>
              <ArrowRight className="mt-0.5 inline size-5" />
            </div>
          )}
          {form.formState.isSubmitting && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </>
          )}
        </Button>
        {form.formState.errors.root && (
          <p className="text-sm text-red-500">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Form>
  );
}
