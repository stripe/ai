import * as React from 'react';

import {cn} from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, type, ...props}, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'placeholder:text-muted-foreground flex w-full rounded-md border border-gray-300 bg-background px-[8px] py-[4px] text-base outline-accent file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export {Input};
