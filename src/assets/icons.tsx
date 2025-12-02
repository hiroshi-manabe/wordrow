// Minimal Feather-derived icons (MIT License: https://github.com/feathericons/feather)
// Kept inline to avoid extra runtime/download dependencies.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const baseProps = (size: number | undefined) => ({
  width: size ?? 20,
  height: size ?? 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function PlayIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

export function InfoIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

export function StatsIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

export function TrashIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function SettingsIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M11.42 2.05c.32-1.06 1.84-1.06 2.16 0a1.72 1.72 0 0 0 2.57 1.03c.95-.54 2.1.46 1.64 1.46a1.72 1.72 0 0 0 1.01 2.45c1.06.34 1.06 1.87 0 2.21a1.72 1.72 0 0 0-1.01 2.45c.46 1-.69 2-1.64 1.46a1.72 1.72 0 0 0-2.57 1.03c-.32 1.06-1.84 1.06-2.16 0a1.72 1.72 0 0 0-2.57-1.03c-.95.54-2.1-.46-1.64-1.46a1.72 1.72 0 0 0-1.01-2.45c-1.06-.34-1.06-1.87 0-2.21a1.72 1.72 0 0 0 1.01-2.45c-.46-1 .69-2 1.64-1.46a1.72 1.72 0 0 0 2.57-1.03Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

export function BackIcon({ size, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <polyline points="15 18 9 12 15 6" />
      <line x1="9" y1="12" x2="21" y2="12" />
    </svg>
  )
}
