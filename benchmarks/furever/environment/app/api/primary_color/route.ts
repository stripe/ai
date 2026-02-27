import Salon from '@/app/models/salon';
import {authOptions} from '@/lib/auth';
import {getServerSession} from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response('Unauthorized', {status: 401});
    }

    const salon = await Salon.findOne({email: session.user.email});

    if (!salon) {
      return new Response('Salon not found', {status: 404});
    }

    return new Response(JSON.stringify({primaryColor: salon.primaryColor}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error('Error fetching primary color:', error);
    return new Response(error.message, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response('Unauthorized', {status: 401});
    }

    const {primaryColor} = await request.json();

    if (!primaryColor) {
      return new Response('Primary color is required', {status: 400});
    }

    if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) {
      return new Response('Invalid color format', {status: 400});
    }

    const updatedSalon = await Salon.findOneAndUpdate(
      {email: session.user.email},
      {primaryColor: primaryColor},
      {new: true}
    );

    if (!updatedSalon) {
      return new Response('Salon not found', {status: 404});
    }

    return new Response(JSON.stringify({success: true, primaryColor}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error('An error occurred when updating the primary color:', error);
    return new Response(error.message, {status: 500});
  }
}
