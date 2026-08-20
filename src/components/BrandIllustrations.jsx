function SvgFrame({ children, className = "", title }) {
  return (
    <svg
      className={`brand-svg ${className}`}
      viewBox="0 0 160 160"
      fill="none"
      role="img"
      aria-label={title}
    >
      {children}
    </svg>
  );
}

export function UsefulMark() {
  return (
    <SvgFrame title="A finished document" className="useful-mark">
      <path className="svg-surface" d="M39 19h57l25 25v97H39z" />
      <path d="M96 19v26h25M57 70h46M57 88h46M57 106h29" />
      <path className="svg-accent" d="m55 127 10 10 26-28" />
    </SvgFrame>
  );
}

export function PrivacyMark() {
  return (
    <SvgFrame title="A protected local file" className="privacy-mark">
      <path className="svg-surface" d="M29 39h102v81H29z" />
      <path d="M29 61h102M47 50h1M58 50h1M69 50h1" />
      <path
        className="svg-accent"
        d="M80 76 99 83v14c0 12-8 22-19 27-11-5-19-15-19-27V83z"
      />
      <path d="m72 98 6 6 12-14" />
    </SvgFrame>
  );
}

export function GrowthMark() {
  return (
    <SvgFrame title="A workflow growing with its users" className="growth-mark">
      <path className="svg-surface" d="M25 28h48v38H25zM87 94h48v38H87z" />
      <path d="M49 66v25h38M111 94V69H73" />
      <path className="svg-accent" d="m63 81 10 10-10 10M97 59 87 69l10 10" />
      <circle cx="111" cy="47" r="18" />
      <path d="M111 38v18M102 47h18" />
    </SvgFrame>
  );
}

export function CareerMark() {
  return (
    <SvgFrame title="Career documents" className="career-mark">
      <path className="svg-surface" d="M31 24h98v112H31z" />
      <circle cx="61" cy="61" r="15" />
      <path d="M42 94c4-13 12-20 19-20s15 7 19 20M94 51h19M94 67h19M94 83h19M46 111h68" />
      <path className="svg-accent" d="M108 107v19M98 116l10 10 19-22" />
    </SvgFrame>
  );
}

export function BusinessMark() {
  return (
    <SvgFrame title="Invoice and quotation documents" className="business-mark">
      <path className="svg-surface" d="M35 20h90v120H35z" />
      <path d="M52 43h38M52 60h56M52 83h56M52 100h30M94 100h14" />
      <path className="svg-accent" d="M52 122h56M100 114l8 8-8 8" />
      <circle cx="108" cy="43" r="9" />
    </SvgFrame>
  );
}

export function FilesMark() {
  return (
    <SvgFrame title="File conversion and merging" className="files-mark">
      <path className="svg-surface" d="M28 44h69v88H28zM63 28h69v88H63z" />
      <path d="M80 51h35M80 68h35M80 85h22" />
      <path className="svg-accent" d="M39 103h48M76 93l11 10-11 10" />
    </SvgFrame>
  );
}

export function BaakanyaSystemGraphic() {
  return (
    <svg
      className="about-system-svg"
      viewBox="0 0 620 560"
      fill="none"
      role="img"
      aria-label="Baakanya turns details into finished documents"
    >
      <rect className="system-field" x="1" y="1" width="618" height="558" />
      <path className="system-grid" d="M0 140h620M0 420h620M155 0v560M465 0v560" />
      <path className="system-route" d="M79 280h126M415 280h126" />
      <path className="system-arrow" d="m191 267 14 13-14 13M527 267l14 13-14 13" />
      <rect className="system-card" x="28" y="230" width="125" height="100" />
      <path d="M51 253h46M51 272h74M51 291h59M51 310h32" />
      <rect className="system-core" x="205" y="170" width="210" height="220" />
      <rect
        className="system-logo-tile"
        x="247"
        y="203"
        width="126"
        height="154"
        rx="8"
      />
      <image
        href={`${import.meta.env.BASE_URL}baakanya-mark.png?v=2`}
        x="252"
        y="211"
        width="116"
        height="138"
        preserveAspectRatio="xMidYMid meet"
      />
      <rect className="system-card" x="467" y="208" width="125" height="145" />
      <path d="M492 235h52l22 22v69h-74zM544 235v23h22M508 282h42M508 302h42" />
      <circle className="system-dot" cx="79" cy="107" r="7" />
      <circle className="system-dot" cx="541" cy="453" r="7" />
      <text x="28" y="387">DETAILS IN</text>
      <text x="467" y="387">READY TO SEND</text>
      <text x="228" y="446">PREPARE · SORT · SUCCEED</text>
    </svg>
  );
}
