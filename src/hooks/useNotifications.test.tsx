import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from './useNotifications';

const mocks = vi.hoisted(() => ({ rpc: vi.fn().mockResolvedValue({ data: 1, error: null }), removeChannel: vi.fn(), eq: vi.fn(), channel: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'recipient-1' } }) }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ workspace: { id: 'workspace-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc, removeChannel: mocks.removeChannel,
    from: () => {
      const chain: any = { select: () => chain, eq: (...args: unknown[]) => { mocks.eq(...args); return chain; }, order: () => chain,
        limit: () => Promise.resolve({ data: [], error: null }), is: () => Promise.resolve({ count: 73, error: null }) };
      return chain;
    },
    channel: (name: string) => { mocks.channel(name); const channel: any = { on: () => channel, subscribe: () => channel }; return channel; },
  },
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('system notifications', () => {
  it('counts all unread notifications rather than only the displayed page', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unread).toBe(73));
    expect(result.current.items).toEqual([]);
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'recipient-1');
    expect(mocks.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
  });
  it('marks only the active workspace read through the owner-scoped function', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.markRead(); });
    expect(mocks.rpc).toHaveBeenCalledWith('mark_notifications_read', { _workspace_id: 'workspace-1' });
    await act(async () => { await result.current.markRead('notification-1'); });
    expect(mocks.rpc).toHaveBeenCalledWith('mark_notifications_read', { _workspace_id: 'workspace-1', _notification_id: 'notification-1' });
  });
  it('removes its live subscription on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());
    expect(mocks.channel).toHaveBeenCalledWith(expect.stringContaining('notifications-recipient-1-workspace-1-'));
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledOnce();
  });
});