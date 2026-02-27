import AuthenticatedRoute from '@/app/components/AuthenticatedRoute';
import {EmbeddedComponentWrapper} from '@/app/hooks/EmbeddedComponentWrapper';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthenticatedRoute>
      <EmbeddedComponentWrapper>{children}</EmbeddedComponentWrapper>
    </AuthenticatedRoute>
  );
}
