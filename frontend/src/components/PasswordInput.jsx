import { useState } from "react";

// Text input with a show/hide toggle.
export default function PasswordInput({ value, onChange, autoComplete = "current-password", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="input pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 px-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm"
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
