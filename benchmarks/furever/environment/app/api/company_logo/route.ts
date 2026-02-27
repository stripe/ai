import Salon from '@/app/models/salon';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response('Unauthorized', {status: 401});
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response('No file uploaded', {status: 400});
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response('File size must be less than 5MB', {status: 400});
    }

    // Validate file type (only images)
    if (!file.type.startsWith('image/')) {
      return new Response('Only image files are allowed', {status: 400});
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const stripeFile = await stripe.files.create({
      file: {
        data: buffer,
        name: file.name,
        type: file.type,
      },
      purpose: 'business_logo',
    });

    const fileLink = await stripe.fileLinks.create({
      file: stripeFile.id,
    });

    const fileUrl = fileLink.url;

    const updatedSalon = await Salon.findOneAndUpdate(
      {email: session.user.email},
      {companyLogoUrl: fileUrl},
      {new: true}
    );

    if (!updatedSalon) {
      return new Response('Salon not found', {status: 404});
    }

    return new Response(
      JSON.stringify({success: true, companyLogoUrl: fileUrl}),
      {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      }
    );
  } catch (error: any) {
    console.error('An error occurred when uploading company logo:', error);
    return new Response(error.message, {status: 500});
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response('Unauthorized', {status: 401});
    }

    const updatedSalon = await Salon.findOneAndUpdate(
      {email: session.user.email},
      {companyLogoUrl: null},
      {new: true}
    );

    if (!updatedSalon) {
      return new Response('Salon not found', {status: 404});
    }

    return new Response(JSON.stringify({success: true}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error('An error occurred when deleting company logo:', error);
    return new Response(error.message, {status: 500});
  }
}
