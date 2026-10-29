import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repository root. */
export const root = fileURLToPath(new URL('../..', import.meta.url))

export const read = (path: string) => readFileSync(join(root, path), 'utf8')

/** All files under a directory (relative to the repo root), recursively. */
export function walk(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}
