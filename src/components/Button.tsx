import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The app's primary call-to-action, previously inlined ~40 times with drifting
 * padding/radius/tracking and two different gradients. One canonical look, in
 * three sizes. `Button` renders a <button>; `ButtonLink` renders a next/link
 * with the same styling. Pass `className` only for layout (width, flex,
 * margins) — not for restyling the button itself.
 */

export type ButtonSize = "xl" | "lg" | "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 text-white text-center cursor-pointer transition-opacity disabled:opacity-40 active:opacity-80";

const SIZE: Record<ButtonSize, string> = {
  // Prominent submit/hero CTA (log it, save).
  xl: "py-3.5 rounded-xl font-display text-lg tracking-[2px]",
  // Big display CTA (onboarding NEXT, "Log N games", "I was there").
  lg: "py-3.5 rounded-xl font-display text-base tracking-widest",
  // Standard action button.
  md: "px-5 py-2.5 rounded-xl text-sm font-medium",
  // Compact inline action (notification tag actions, etc.).
  sm: "px-3 py-1.5 rounded-lg text-xs font-semibold",
};

const GRADIENT = {
  background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
};

export function buttonClass(size: ButtonSize = "lg", className = ""): string {
  return `${BASE} ${SIZE[size]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  fullWidth?: boolean;
};

export default function Button({ size = "lg", fullWidth, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={buttonClass(size, `${fullWidth ? "w-full " : ""}${className}`)}
      style={GRADIENT}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({ href, size = "lg", fullWidth, className = "", children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClass(size, `${fullWidth ? "w-full " : ""}${className}`)}
      style={GRADIENT}
    >
      {children}
    </Link>
  );
}
