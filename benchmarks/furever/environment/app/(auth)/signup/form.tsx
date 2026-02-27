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

export default function SignupForm() {
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
      const result = await signIn('signup', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // Just assume the error is because the email is already in use
        form.setError('root', {
          type: 'manual',
          message: 'The email is already in use.',
        });
      } else if (result?.ok) {
        router.push('/business');
      }
    } catch (error: any) {
      console.error('An error occurred when signing in', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    className="rounded-md border border-gray-300 p-2 placeholder:text-gray-400"
                    placeholder="jenny.rosen@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="pb-3">
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
          className={'w-full rounded-md font-bold text-white'}
        >
          {form.formState.isSubmitting || form.formState.isSubmitSuccessful ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </>
          ) : (
            <div className="flex items-center gap-2 text-base font-medium">
              <p>Create account</p>
              <ArrowRight size={20} />
            </div>
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
