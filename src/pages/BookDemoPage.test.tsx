import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import BookDemoPage from './BookDemoPage';

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (s: string) => s }), translate: (s: string) => s }));
vi.mock('@/components/LanguageToggle', () => ({ LanguageToggle: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('does not report success when demo request delivery fails', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  insert.mockResolvedValue({ error: { message: 'missing request storage' } });
  const { container } = render(<MemoryRouter><BookDemoPage /></MemoryRouter>);
  for (const [id, value] of Object.entries({ fullName: 'Demo Tester', workEmail: 'demo@example.org', company: 'Example', role: 'Director' })) {
    fireEvent.change(container.querySelector(`#${id}`) as HTMLInputElement, { target: { value } });
  }
  // Select a real company-size option before submitting.
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: '11–50' }));
  fireEvent.click(screen.getByRole('button', { name: 'web.submitRequest' }));
  await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('alert')).toHaveTextContent('web.bookingFailed');
  expect(screen.queryByText('You’re all set')).toBeNull();
});