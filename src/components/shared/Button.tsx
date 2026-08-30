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
    'border-ember/70 bg-[#d5ab51] text-[#020202] shadow-[0_10px_24px_rgba(200,155,60,0.16),inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-[#e0b85f] hover:shadow-[0_14px_30px_rgba(200,155,60,0.22)]',
  secondary:
    'border-bronze/30 bg-stardust/[0.035] text-stardust/86 hover:border-ember/42 hover:bg-stardust/[0.075]',
  ghost:
    'border-transparent bg-transparent text-stardust/62 hover:bg-stardust/[0.06] hover:text-stardust',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-sm',
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
        'atelier-button inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:pointer-events-none',
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
