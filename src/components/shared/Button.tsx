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
    'border-ember/60 bg-[linear-gradient(135deg,#C89B3C,#EDE3CF)] text-midnight shadow-[0_16px_34px_rgba(200,155,60,0.2),inset_0_1px_0_rgba(255,255,255,0.34)] hover:border-stardust/70 hover:shadow-[0_20px_44px_rgba(200,155,60,0.28),inset_0_1px_0_rgba(255,255,255,0.38)]',
  secondary:
    'border-bronze/46 bg-[linear-gradient(145deg,rgba(61,43,31,0.76),rgba(10,10,10,0.42))] text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.05)] hover:border-ember/50 hover:bg-espresso',
  ghost:
    'border-transparent bg-transparent text-stardust/70 hover:border-bronze/38 hover:bg-stardust/[0.075] hover:text-stardust',
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
        'inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45',
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
