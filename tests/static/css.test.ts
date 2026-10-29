// @vitest-environment node
// Regression: colour contrast (WCAG 1.4.3 / 1.4.11) and the CSS fixes from the
// dark-mode, accessibility and mobile work. Colours are read from src/index.css,
// so changing a token re-checks every pair that depends on it.
import { describe, expect, it } from 'vitest'
import { read } from './files.ts'

const css = read('src/index.css')

/** Body of the first rule whose selector line matches exactly. */
function block(selector: string) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No rule for ${selector}`)
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', start) + 1, i)
  }
  throw new Error(`Unclosed rule ${selector}`)
}

function tokens(selector: string) {
  return Object.fromEntries(
    [...block(selector).matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const light = tokens(':root')
const dark = { ...light, ...tokens(":root[data-theme='dark']") }

/** Resolve var(--x) chains to a hex colour. */
function color(theme: Record<string, string>, name: string): string {
  const value = theme[name]
  const ref = value?.match(/^var\(--([\w-]+)\)$/)
  if (ref) return color(theme, ref[1])
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) throw new Error(`--${name} is not a hex colour: ${value}`)
  return value
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
/** CSS color-mix(in srgb, a p, b) */
const mix = (a: string, p: number, b: string) => toHex(rgb(a).map((v, i) => v * p + rgb(b)[i] * (1 - p)))
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_name, theme) => {
  const c = (name: string) => color(theme, name)

  it.each([
    ['text', 'bg'],
    ['text', 'surface'],
    ['muted', 'surface'],
    ['muted', 'bg'],
    ['muted', 'column'],
    ['danger', 'surface'],
  ])('text: --%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrast(c(fg), c(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['control-border', 'bg'],
    ['control-border', 'surface'],
    ['focus', 'surface'],
    ['focus', 'bg'],
  ])('UI: --%s on --%s is at least 3:1', (fg, bg) => {
    expect(contrast(c(fg), c(bg))).toBeGreaterThanOrEqual(3)
  })

  it('white button text on --primary is at least 4.5:1', () => {
    expect(contrast('#ffffff', c('primary'))).toBeGreaterThanOrEqual(4.5)
  })

  it('error banner text on its tint is at least 4.5:1', () => {
    const banner = block('.error-banner')
    const p = Number(banner.match(/color: color-mix\(in srgb, var\(--danger\) (\d+)%, var\(--text\)\)/)?.[1]) / 100
    expect(p).toBeGreaterThan(0)
    const bg = mix(c('danger'), 0.12, c('surface'))
    expect(contrast(mix(c('danger'), p, c('text')), bg)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('CSS fixes', () => {
  it('dark mode is driven by data-theme (so the toggle can override the OS)', () => {
    expect(css).toContain(":root[data-theme='dark'] {")
    expect(tokens(":root[data-theme='dark']")['color-scheme' as never]).toBeUndefined()
    expect(block(":root[data-theme='dark']")).toContain('color-scheme: dark')
  })

  it('"No due date" is not faded (a 70% fade failed contrast)', () => {
    expect(block('.card-due--none')).not.toMatch(/opacity/)
  })

  it('long text wraps instead of truncating (1.4.10)', () => {
    for (const selector of ['.toast-message', '.card-assignee']) {
      expect(block(selector)).not.toMatch(/text-overflow|white-space: nowrap/)
    }
  })

  it('every button style has a visible focus indicator (2.4.7)', () => {
    for (const selector of ['.btn:focus-visible', '.icon-btn:focus-visible', '.move-menu button:focus-visible']) {
      expect(block(selector)).toMatch(/outline: 2px solid/)
    }
  })

  it('keeps focused elements clear of the fixed toast (2.4.11)', () => {
    expect(block('html')).toMatch(/scroll-padding-bottom: \d+px/)
  })

  it('respects reduced motion and Windows High Contrast', () => {
    expect(block('@media (prefers-reduced-motion: reduce)')).toMatch(/transition-duration/)
    expect(block('@media (forced-colors: active)')).toMatch(/Highlight/)
  })

  it('stacks the columns vertically on mobile', () => {
    const mobile = block('@media (max-width: 640px)')
    expect(mobile).toMatch(/\.board \{[^}]*grid-template-columns: 1fr/)
  })

  it('only hides Move/Edit until hover on devices that can hover', () => {
    expect(block('@media (hover: hover)')).toMatch(/opacity: 0/)
  })
})
