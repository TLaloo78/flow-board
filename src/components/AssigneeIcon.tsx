import type { ReactNode } from 'react'

// Line drawings on a 24×24 grid; `M x y h.01` with round caps draws a dot (eyes).
const ICONS: { keywords: string[]; paths: ReactNode }[] = [
  {
    keywords: ['dog', 'pup', 'puppy', 'doggo'],
    paths: (
      <>
        {/* Labrador in profile: head and neck, drop ear, then eye, nose, mouth, collar. */}
        <path d="M5.5 20c-.8-3-1-6 0-9C6.6 7.6 8.6 5 11.3 5c1.8 0 2.7 1 3.3 2.4l4.4.9c1.1.2 1.6 1 1.6 1.9 0 1.1-.7 1.7-1.6 1.9l-2 .4c-.6 1.3-1.8 2.2-3.5 2.6L13 20" />
        <path d="M9.6 6.2C8.3 7.5 7.8 10 8.6 12.3c.4 1.1 1.4 1.4 2.2.8 1.3-1 1.8-3.4 1.6-5.9" />
        <path d="M14.6 9.3h.01M19.4 9.5h.6M17 12.2c-.7.4-1.5.4-2.2.1M5.5 17c2.3.9 5 .9 7.4 0" />
      </>
    ),
  },
  {
    keywords: ['bunny', 'rabbit', 'hare'],
    paths: (
      <>
        {/* Front-facing bunny: two upright ears, round face, then eyes, nose, mouth, whiskers. */}
        <path d="M9.5 9.8C8 7.6 7.6 3.8 8.8 2.8c1.3-1 2.9 2.1 2.5 6.3M14.5 9.8c1.5-2.2 1.9-6 .7-7-1.3-1-2.9 2.1-2.5 6.3" />
        <ellipse cx="12" cy="14.6" rx="5.6" ry="5" />
        <path d="M9.8 13.6h.01M14.2 13.6h.01M11.3 15.6h1.4L12 16.3zM12 16.3c-.3.6-.8.8-1.3.7M12 16.3c.3.6.8.8 1.3.7M8.4 16.2l-3.6-.5M8.4 17.2l-3.3.7M15.6 16.2l3.6-.5M15.6 17.2l3.3.7" />
      </>
    ),
  },
  {
    keywords: ['money', 'cash', 'coin', 'dollar', 'rich'],
    paths: (
      <>
        <path d="M9 3.5h6L13.5 7h-3z" />
        <path d="M10.5 7C6 9 4 13 4 16a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5c0-3-2-7-6.5-9" />
        <path d="M14 12.5c-.5-.7-1.2-1-2-1-1.1 0-2 .6-2 1.5s.9 1.3 2 1.5 2 .6 2 1.5-.9 1.5-2 1.5c-.8 0-1.5-.3-2-1M12 10.5v1M12 17.5v1" />
      </>
    ),
  },
  {
    keywords: ['captain', 'agenda', 'boss', 'chief'],
    paths: (
      <>
        <path d="M4 13c0-4 3.6-7 8-7s8 3 8 7z" />
        <path d="M4 13v2.5h16V13" />
        <path d="M5 15.5c2.5 3 11.5 3 14 0M12 8.5v2.5M10.75 9.75h2.5" />
      </>
    ),
  },
  {
    keywords: ['cat', 'kitty', 'kitten'],
    paths: (
      <>
        <path d="M5 4l3 4h8l3-4v9a7 7 0 0 1-14 0z" />
        <path d="M9.5 12h.01M14.5 12h.01M11.5 15h1M2 14l4 .5M2 17l4-1M22 14l-4 .5M22 17l-4-1" />
      </>
    ),
  },
]

function findIcon(name: string): ReactNode | null {
  const words = name.toLowerCase().split(/[^a-z]+/)
  return ICONS.find((icon) => icon.keywords.some((k) => words.includes(k)))?.paths ?? null
}

/** Avatar for an assignee: a themed line icon if the name suggests one, else the initial. */
export function AssigneeIcon({ name }: { name: string }) {
  const paths = findIcon(name)
  return (
    <span className={paths ? 'avatar avatar--icon' : 'avatar'} aria-hidden="true">
      {paths ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {paths}
        </svg>
      ) : (
        name.trim().charAt(0).toUpperCase() || '?'
      )}
    </span>
  )
}
