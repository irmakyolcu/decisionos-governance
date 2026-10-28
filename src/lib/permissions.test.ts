import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSIONS } from './permissions';

describe('workspace role permissions', () => {
  it('grants no privileges to an unapproved registration', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(hasPermission(null, permission)).toBe(false);
    }
  });
  it('permits only admins to assign roles or invite members', () => {
    expect(hasPermission('admin', 'inviteMember')).toBe(true);
    expect(hasPermission('admin', 'changeMemberRole')).toBe(true);
    for (const role of ['viewer', 'auditor', 'approver'] as const) {
      expect(hasPermission(role, 'inviteMember')).toBe(false);
      expect(hasPermission(role, 'changeMemberRole')).toBe(false);
    }
  });
  it('does not grant auditors or viewers write permissions', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(hasPermission('auditor', permission)).toBe(false);
      expect(hasPermission('viewer', permission)).toBe(false);
    }
  });
});