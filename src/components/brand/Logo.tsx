type LogoMarkProps = {
  size?: number
  className?: string
}

/**
 * The smartup squircle mark — black top/bottom wedges, blue left, green right.
 * Four triangles clipped to a squircle.
 */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="smartup"
    >
      <defs>
        <clipPath id="logo-squircle">
          <rect width="100" height="100" rx="34" ry="34" />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-squircle)">
        {/* top + bottom wedges — black */}
        <path d="M0 0 L100 0 L50 50 Z" fill="#0A0E14" />
        <path d="M0 100 L100 100 L50 50 Z" fill="#0A0E14" />
        {/* left wedge — blue */}
        <path d="M0 0 L0 100 L50 50 Z" fill="#0C97D1" />
        {/* right wedge — green */}
        <path d="M100 0 L100 100 L50 50 Z" fill="#35C07B" />
      </g>
    </svg>
  )
}
