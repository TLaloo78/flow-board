// window.matchMedia for jsdom. One shared MediaQueryList per query, because
// useTheme keeps the list it gets at import time; tests flip the OS setting
// with setSystemDark() and the app sees a real 'change' event.
type Listener = (e: MediaQueryListEvent) => void

const lists = new Map<string, MediaQueryList & { listeners: Set<Listener> }>()
let systemDark = false

const evaluate = (query: string) => (query.includes('prefers-color-scheme: dark') ? systemDark : false)

export function installMatchMedia() {
  window.matchMedia = (query: string) => {
    let list = lists.get(query)
    if (!list) {
      const listeners = new Set<Listener>()
      list = {
        media: query,
        get matches() {
          return evaluate(query)
        },
        onchange: null,
        listeners,
        addEventListener: (_type: string, l: Listener) => listeners.add(l),
        removeEventListener: (_type: string, l: Listener) => listeners.delete(l),
        addListener: (l: Listener) => listeners.add(l),
        removeListener: (l: Listener) => listeners.delete(l),
        dispatchEvent: () => true,
      } as unknown as MediaQueryList & { listeners: Set<Listener> }
      lists.set(query, list)
    }
    return list
  }
}

/** Change the simulated OS colour scheme and notify listeners. */
export function setSystemDark(dark: boolean) {
  systemDark = dark
  for (const list of lists.values()) {
    const event = { matches: list.matches, media: list.media } as MediaQueryListEvent
    list.listeners.forEach((l) => l(event))
  }
}
