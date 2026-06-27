"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Layout/margin classes for the wrapper (the input's own visual style goes in className). */
  wrapperClassName?: string;
};

/**
 * Password field with a show/hide toggle. Manages its own reveal state, so it
 * drops in anywhere a password input is used (login, signup, reset, settings).
 * Pass the input's visual classes in `className`; put any margin/layout on
 * `wrapperClassName` so spacing stays on the wrapper, not the input.
 */
export default function PasswordInput({
  className = "",
  wrapperClassName = "",
  ...props
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
      >
        {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
