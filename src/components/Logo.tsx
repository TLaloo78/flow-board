/** Flow Board mark: three board columns, matching public/favicon.svg. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 48 48" aria-hidden="true">
      {/* Lighter than the navy header so the tile stays visible on it. */}
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="10" fill="#0f2a42" stroke="rgba(247, 244, 242, 0.18)" strokeWidth="1.5" />
      <rect x="9" y="11" width="8" height="26" rx="2" fill="#53b3e7" />
      <rect x="20" y="11" width="8" height="18" rx="2" fill="#295ec6" />
      <rect x="31" y="11" width="8" height="22" rx="2" fill="#f7f4f2" />
    </svg>
  )
}
