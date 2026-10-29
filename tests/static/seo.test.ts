// @vitest-environment node
// Regression: SEO/GEO and page-speed fixes. The app is private, so the goal is
// "stay out of search and AI crawlers, but preview well when shared".
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { read, root } from './files.ts'

const html = read('index.html')
const meta = (attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`))?.[1]

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string) {
  const bytes = readFileSync(join(root, path))
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('index.html', () => {
  it('declares the language and a title', () => {
    expect(html).toMatch(/<html lang="en">/)
    expect(html).toMatch(/<title>Flow Board<\/title>/)
  })

  it('asks search engines not to index the private app', () => {
    expect(meta('name', 'robots')).toBe('noindex, nofollow')
  })

  it('has a meta description of useful length', () => {
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1] ?? ''
    expect(description.length).toBeGreaterThanOrEqual(70)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('has complete Open Graph and Twitter link-preview tags with absolute URLs', () => {
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:title')).toBe('Flow Board')
    expect(meta('property', 'og:description')).toBeTruthy()
    expect(meta('property', 'og:url')).toBe('%VITE_SITE_URL%/')
    expect(meta('property', 'og:image')).toBe('%VITE_SITE_URL%/og-image.png')
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('property', 'og:image:alt')).toBeTruthy()
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:image')).toBe('%VITE_SITE_URL%/og-image.png')
  })

  it('connects to Supabase early and explains itself without JavaScript', () => {
    expect(html).toMatch(/<link rel="preconnect" href="%VITE_SUPABASE_URL%" crossorigin \/>/)
    expect(html).toMatch(/<noscript>[^<]+<\/noscript>/)
  })

  it('links the SVG favicon and the iOS icon', () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />')
  })

  it('applies the saved theme before first paint', () => {
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toContain("localStorage.getItem('flow-board-theme')")
    expect(head).toContain('document.documentElement.dataset.theme = theme')
  })
})

describe('public assets', () => {
  const robots = read('public/robots.txt')

  it('robots.txt lets search engines see the noindex tag but blocks AI crawlers', () => {
    const groups = robots.split(/\n\s*\n/).filter((g) => /User-agent:/i.test(g))
    const star = groups.find((g) => /User-agent:\s*\*/.test(g))!
    expect(star).toMatch(/Allow:\s*\/\s*$/m)
    expect(star).not.toMatch(/Disallow:\s*\/\s*$/m)

    const ai = groups.find((g) => /GPTBot/.test(g))!
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']) {
      expect(ai).toMatch(new RegExp(`User-agent:\\s*${bot}\\s*$`, 'm'))
    }
    expect(ai).toMatch(/Disallow:\s*\/\s*$/m)
  })

  it('has no sitemap (the app asks not to be indexed)', () => {
    expect(robots).not.toMatch(/^Sitemap:/im)
  })

  it('has a 1200×630 preview image and a 180×180 iOS icon', () => {
    expect(pngSize('public/og-image.png')).toEqual({ width: 1200, height: 630 })
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 })
  })
})

describe('build config', () => {
  it('splits React and Supabase into separately cached chunks', () => {
    const config = read('vite.config.ts')
    expect(config).toMatch(/name: 'react'/)
    expect(config).toMatch(/name: 'supabase'/)
  })
})
