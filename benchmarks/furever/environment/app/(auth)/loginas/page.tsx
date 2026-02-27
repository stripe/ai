import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import Form from './form';

export default async function LoginAs() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Select Account</h2>
      </div>
      <Form />
      <div className="text-secondary">
        New user?{' '}
        <Link href="/signup" className="font-bold">
          Create an account{' '}
        </Link>
      </div>
    </>
  );
}
