import { describe, expect, it, vi } from 'vitest'
import { loadRoutes } from './routing'
describe('routing fallback', () => { it('uses explicitly marked sample routes when the API fails', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); const result = await loadRoutes(); expect(result.isFallback).toBe(true); expect(result.routes[0].source).toBe('fallback'); vi.unstubAllGlobals() }) })
