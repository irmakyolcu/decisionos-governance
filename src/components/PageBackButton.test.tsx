import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PageBackButton, getBackFallback } from './PageBackButton';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: () => 'Geri' }) }));

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '');
});

describe('PageBackButton', () => {
  it('returns to the previous page when navigated within the app', () => {
    window.history.replaceState({ idx: 1 }, '');
    render(<MemoryRouter initialEntries={['/reports', '/memory/lessons']} initialIndex={1}><PageBackButton /><CurrentPath /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByTestId('path').textContent).toBe('/reports');
  });

  it('returns direct lesson-page visits to the memory hub', () => {
    window.history.replaceState({ idx: 0 }, '');
    render(<MemoryRouter initialEntries={['/memory/lessons']}><PageBackButton /><CurrentPath /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByTestId('path').textContent).toBe('/memory');
  });

  it.each(['/', '/home-legacy', '/decisions/example', '/decisions/list/example', '/integrations/slack'])('does not duplicate back controls on %s', (path) => {
    render(<MemoryRouter initialEntries={[path]}><PageBackButton /></MemoryRouter>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps a back control on the decision list', () => {
    render(<MemoryRouter initialEntries={['/decisions/list']}><PageBackButton /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Geri' })).toBeTruthy();
  });

  it('provides contextual fallback destinations', () => {
    expect(getBackFallback('/meeting-sources')).toBe('/meetings');
    expect(getBackFallback('/decisions/list')).toBe('/decisions');
    expect(getBackFallback('/reports')).toBe('/');
  });
});