import { InputHTMLAttributes, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
};

export function PasswordInput({
  className = "",
  wrapperClassName = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-white"
      >
        {visible ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.22" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A9.77 9.77 0 0112 4.5c4.78 0 8.73 3.19 9.88 7.5a10.7 10.7 0 01-4.16 5.94" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.61 6.61A10.72 10.72 0 002.12 12c.51 1.91 1.72 3.64 3.41 4.95A9.76 9.76 0 0012 19.5c1.68 0 3.27-.42 4.66-1.16" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.12 12C3.27 7.69 7.22 4.5 12 4.5S20.73 7.69 21.88 12c-1.15 4.31-5.1 7.5-9.88 7.5S3.27 16.31 2.12 12z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
        )}
      </button>
    </div>
  );
}