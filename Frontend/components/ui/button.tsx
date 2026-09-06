import * as React from 'react';
import { cn } from '../../lib/utils';

export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors',
        'bg-brand-500 text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
