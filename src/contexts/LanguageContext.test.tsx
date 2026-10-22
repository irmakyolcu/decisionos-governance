import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('language selection', () => {
  it('persists English and restores it with the matching locale', () => {
    const first = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    act(() => first.result.current.setLang('en'));
    expect(localStorage.getItem('lang')).toBe('en');
    first.unmount();
    const restored = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    expect(restored.result.current.lang).toBe('en');
    expect(restored.result.current.locale).toBe('en-US');
  });

  it('switches back to Turkish and updates the document language', () => {
    localStorage.setItem('lang', 'en');
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    act(() => result.current.setLang('tr'));
    expect(result.current.locale).toBe('tr-TR');
    expect(document.documentElement.lang).toBe('tr');
    expect(localStorage.getItem('lang')).toBe('tr');
  });

  it('still switches language when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    act(() => result.current.setLang('en'));
    expect(result.current.lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});