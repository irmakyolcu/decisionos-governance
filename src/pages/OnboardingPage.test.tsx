import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import OnboardingPage from './OnboardingPage';

const mocks = vi.hoisted(() => ({ refetch: vi.fn().mockResolvedValue(undefined), signOut: vi.fn().mockResolvedValue(undefined), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'new-registration' }, signOut: mocks.signOut }) }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ refetch: mocks.refetch, workspace: null, role: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

describe('unapproved registrations', () => {
  it('cannot create a workspace or assign themselves admin when checking access', async () => {
    localStorage.setItem('lang', 'en');
    render(<MemoryRouter><LanguageProvider><OnboardingPage /></LanguageProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Check access' }));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledOnce());
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});