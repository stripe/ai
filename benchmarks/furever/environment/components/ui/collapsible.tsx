import * as React from 'react';
import {ChevronUp, ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface CollapsibleProps {
  open: boolean;
  children: React.ReactNode;
}

const Collapsible = React.forwardRef<HTMLInputElement, CollapsibleProps>(
  ({open, children, ...props}, ref) => {
    return <>{open && children}</>;
  }
);
Collapsible.displayName = 'Collapsible';

export {Collapsible};
