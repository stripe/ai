import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';
import BusinessDetailsForm from './form';

export default async function Business() {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return redirect('/login');
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold text-primary">Business details</h2>
      </div>
      <p className="text-secondary">
        Let us know a few more details of your business
      </p>
      <BusinessDetailsForm email={session.user.email} />
    </>
  );
}
