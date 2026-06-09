import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/classes';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border-ember/55 bg-ember text-midnight shadow-[0_14px_30px_rgba(200,155,60,0.18)] hover:bg-stardust',
  secondary:
    'border-bronze/45 bg-espresso/60 text-stardust hover:border-ember/45 hover:bg-espresso',
  ghost:
    'border-transparent bg-transparent text-stardust/68 hover:border-bronze/35 hover:bg-stardust/6 hover:text-stardust',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-sm',
};

export function Button({
  children,
  className,
  icon,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition duration-200 disabled:opacity-45',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
