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

    return new Response(JSON.stringify({companyName: salon.companyName}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error('Error fetching company name:', error);
    return new Response(error.message, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response('Unauthorized', {status: 401});
    }

    const {companyName} = await request.json();

    if (!companyName) {
      return new Response('Company name is required', {status: 400});
    }

    if (companyName.length > 100) {
      return new Response('Company name must be less than 100 characters', {
        status: 400,
      });
    }

    const updatedSalon = await Salon.findOneAndUpdate(
      {email: session.user.email},
      {companyName: companyName},
      {new: true}
    );

    if (!updatedSalon) {
      return new Response('Salon not found', {status: 404});
    }

    return new Response(JSON.stringify({success: true, companyName}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error('An error occurred when updating the company name:', error);
    return new Response(error.message, {status: 500});
  }
}
