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

const formSchema = z.object({
  accountId: z.string().startsWith('acct_'),
});

export default function LoginAsForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await signIn('loginas', {
        accountId: values.accountId,
        redirect: false,
      });
      router.push('/');
    } catch (error: any) {
      console.error('An error occurred when selecting the account', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col space-y-2">
          <FormField
            control={form.control}
            name="accountId"
            render={({field}) => (
              <FormItem>
                <FormLabel className="font-bold">Account ID</FormLabel>
                <FormControl>
                  <Input
                    className="rounded-md border border-gray-300 p-2 placeholder:text-gray-400"
                    placeholder="acct_1234567890abcdef"
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
          className={'w-full rounded-md bg-primary p-2 font-bold text-white'}
        >
          {!form.formState.isSubmitting && (
            <div className="flex flex-col space-y-2">
              Log in <ArrowRight className="mb-0.5 inline" strokeWidth={2.5} />
            </div>
          )}
          {form.formState.isSubmitting && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
