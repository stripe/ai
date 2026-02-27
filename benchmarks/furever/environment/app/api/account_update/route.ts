import {type NextRequest} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import Salon from '@/app/models/salon';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response('Unauthorized', {status: 401});
    }

    const json = await req.json();

    const {newEmail, newPassword} = json;
    const updatedEmail = newEmail || session?.user?.email;
    const updatedPassword = newPassword || session?.user?.password;
    const update = {
      email: updatedEmail,
      password: updatedPassword,
      changedPassword: true,
    };
    console.log('updating account with, ', update);

    await Salon.findOneAndUpdate({email: session?.user?.email}, update);

    const newUser = await Salon.findOne({email: updatedEmail});
    console.log('updated account, ', newUser);
    return new Response(
      JSON.stringify({
        email: updatedEmail,
        password: updatedPassword,
      }),
      {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      }
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create an account session',
      error
    );
    return new Response(JSON.stringify({error: error.message}), {status: 500});
  }
}
