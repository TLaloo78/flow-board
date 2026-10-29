import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// Every test gets the in-memory fake instead of the real client.
vi.mock('../lib/supabase', async () => ({ supabase: (await import('./supabaseMock')).fakeSupabase }))

// Safety net: if anything ever builds a real client, fail loudly rather than hit the network.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    throw new Error('Tests must not create a real Supabase client; use src/test/supabaseMock.ts')
  },
}))

// Browser APIs jsdom lacks. Skipped for the node-environment static tests.
if (typeof window !== 'undefined') {
  const { installMatchMedia, setSystemDark } = await import('./matchMedia')
  installMatchMedia()
  afterEach(() => setSystemDark(false))
  installDialog()
  installPopover()

  const { cleanup } = await import('@testing-library/react')
  afterEach(() => {
    cleanup()
    localStorage.clear()
    delete document.documentElement.dataset.theme
    document.title = ''
  })
}

/** Minimal <dialog> modal support (CardModal calls showModal/close). */
function installDialog() {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal === 'function') return
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.show = proto.showModal
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

/** Popover API: show/hide/toggle, toggle events with newState, and popovertarget buttons (Move menu). */
function installPopover() {
  const proto = HTMLElement.prototype
  if (typeof proto.showPopover === 'function') return
  const open = new WeakSet<HTMLElement>()

  const fire = (el: HTMLElement, type: string, oldState: string, newState: string) => {
    const event = Object.assign(new Event(type), { oldState, newState })
    el.dispatchEvent(event)
  }

  const toggle = (el: HTMLElement, force?: boolean) => {
    const isOpen = open.has(el)
    const next = force ?? !isOpen
    if (next === isOpen) return isOpen
    const [from, to] = next ? ['closed', 'open'] : ['open', 'closed']
    fire(el, 'beforetoggle', from, to)
    if (next) open.add(el)
    else open.delete(el)
    // jsdom hides [popover] elements with its UA stylesheet but never matches
    // :popover-open, so show open ones explicitly; closed menus stay hidden.
    el.style.display = next ? 'block' : ''
    fire(el, 'toggle', from, to)
    return next
  }

  proto.showPopover = function (this: HTMLElement) {
    toggle(this, true)
  }
  proto.hidePopover = function (this: HTMLElement) {
    toggle(this, false)
  }
  proto.togglePopover = function (this: HTMLElement, force?: boolean | { force?: boolean }) {
    return toggle(this, typeof force === 'object' ? force.force : force)
  }

  document.addEventListener('click', (e) => {
    const button = (e.target as Element | null)?.closest?.('[popovertarget]')
    const target = button && document.getElementById(button.getAttribute('popovertarget')!)
    if (target) toggle(target)
  })
}
