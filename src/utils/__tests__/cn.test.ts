import { describe, expect, it } from 'vitest'

import { cn } from '../cn'

describe('cn utility', () => {
  it('merges class names and filters falsy values', () => {
    expect(cn('base', null, undefined, false, 'active')).toBe('base active')
  })

  it('deduplicates conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
