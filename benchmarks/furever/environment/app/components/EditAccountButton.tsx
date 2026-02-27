import Link from 'next/link';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useSession} from 'next-auth/react';
import {redirect, useRouter} from 'next/navigation';
import React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import bcrypt from 'bcryptjs';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const EditAccountButton = () => {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const EditAccountForm = () => {
    const {data: session, update} = useSession();

    if (!session) {
      redirect('/home');
    }

    const email = session?.user?.email;
    const password = session?.user?.password;
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        email: email || '',
        password: '',
      },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
      console.log('submitting');
      const data = {
        newEmail: values.email,
        newPassword: bcrypt.hashSync(values.password, 8),
        changedPassword: true,
      };

      const response = await fetch('/api/account_update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        // Handle errors on the client side here
        const {error} = await response.json();
        console.warn('An error occurred: ', error);
        return undefined;
      } else {
        const {email: newEmail, password: newPassword} = await response.json();

        console.log('response ok', newEmail, newPassword);
        const promise = await update({
          user: {
            ...session.user,
            email: newEmail,
            password: newPassword,
            changedPassword: true,
          },
        });
        console.log('updated user', promise?.user);
        setOpen(false);
        router.refresh();
      }
    };

    return (
      <>
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
                        placeholder={email || 'email@email.com'}
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
                        placeholder={'password'}
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flew-row flex justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="default" type="submit">
                Update
              </Button>
            </div>
          </form>
        </Form>
      </>
    );
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Link href="#">Edit </Link>
      </DialogTrigger>
      <DialogContent className="text-primary">
        <DialogHeader>
          <DialogTitle>Edit login details</DialogTitle>
        </DialogHeader>
        <EditAccountForm />
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountButton;
