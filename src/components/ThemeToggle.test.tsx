// Regression: dark mode toggle (accessible switch, persisted choice, follows the OS until overridden).
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setSystemDark } from '../test/matchMedia'
import { ThemeToggle } from './ThemeToggle'

const theme = () => document.documentElement.dataset.theme
const toggle = () => screen.getByRole('button', { name: 'Dark mode' })

describe('ThemeToggle', () => {
  it('is a pressed/unpressed button with a fixed name, and switches the page theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(theme()).toBe('light')

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(theme()).toBe('dark')
    expect(localStorage.getItem('flow-board-theme')).toBe('dark')

    await user.click(toggle())
    expect(theme()).toBe('light')
    expect(localStorage.getItem('flow-board-theme')).toBe('light')
  })

  it('starts from the saved choice', () => {
    localStorage.setItem('flow-board-theme', 'dark')
    render(<ThemeToggle />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(theme()).toBe('dark')
  })

  it('follows the OS setting until the user picks a theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    act(() => setSystemDark(true))
    expect(theme()).toBe('dark')
    act(() => setSystemDark(false))
    expect(theme()).toBe('light')

    await user.click(toggle()) // explicit choice: dark
    act(() => setSystemDark(false))
    expect(theme()).toBe('dark')
  })

  it('works by keyboard', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.tab()
    expect(toggle()).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(theme()).toBe('dark')
  })
})
