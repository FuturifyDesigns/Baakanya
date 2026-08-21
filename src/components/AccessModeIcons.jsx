function ModeIcon({ children, title }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Seven-day calendar mark */
export function TrialIcon() {
  return (
    <ModeIcon title="Free trial">
      <rect x="4.5" y="7" width="23" height="20" rx="2.5" />
      <path d="M4.5 12.5h23M10 4.5v5M22 4.5v5" />
      <path d="M12 18.5h2.2M16 16v7M20 18.5h2.2" />
    </ModeIcon>
  );
}

/** Five stacked ticket stubs for credits */
export function CreditsIcon() {
  return (
    <ModeIcon title="Document credits">
      <path d="M7 10.5h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" />
      <path d="M11 10.5V8.8a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 21 8.8v1.7" />
      <path d="M9.5 16.5h5M9.5 20h8" />
      <circle cx="22" cy="18.5" r="1.4" />
    </ModeIcon>
  );
}

/** Month grid for unlimited monthly access */
export function MonthlyIcon() {
  return (
    <ModeIcon title="Monthly unlimited">
      <rect x="4.5" y="7" width="23" height="20" rx="2.5" />
      <path d="M4.5 12.5h23M10 4.5v5M22 4.5v5" />
      <path d="M10 17h2.2M14.9 17h2.2M19.8 17h2.2M10 21.5h2.2M14.9 21.5h2.2M19.8 21.5h2.2" />
    </ModeIcon>
  );
}
