/**
 * Regression: double-submitting "Create Group" created two workspaces with the
 * same name. Concurrent identical requests must insert exactly one row.
 *
 * Run with:  npm test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const readSource = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const repo = vi.hoisted(() => ({
  createGroupRepo: vi.fn(),
  addToGroupMembersRepo: vi.fn(),
}));

vi.mock('../modules/groups/group.repository.js', () => ({
  createGroupRepo: repo.createGroupRepo,
  addToGroupMembersRepo: repo.addToGroupMembersRepo,
  deleteGroupRepo: vi.fn(),
  updateGroupRepo: vi.fn(),
  getAllDataBy: vi.fn(),
  joinGroupRepo: vi.fn(),
  getDataByField: vi.fn(),
  getPendingReq: vi.fn(),
  getAllDataByField: vi.fn(),
  changeRequestStatus: vi.fn(),
  getGroupById: vi.fn(),
}));

const { createGroupService } = await import('../modules/groups/group.service.js');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let nextId;

beforeEach(() => {
  nextId = 1;
  repo.createGroupRepo.mockReset().mockImplementation(async (row) => {
    await delay(30); // network latency to the database
    return { id: nextId++, ...row };
  });
  repo.addToGroupMembersRepo.mockReset().mockResolvedValue({});
});

describe('createGroupService – duplicate submissions', () => {
  it('inserts one group when the same request arrives twice concurrently', async () => {
    const input = { name: 'Thesis Team', description: 'd', ownerId: 'u1', color: '#7a1e1e' };
    const [a, b] = await Promise.all([createGroupService(input), createGroupService(input)]);

    expect(repo.createGroupRepo).toHaveBeenCalledTimes(1);
    expect(repo.addToGroupMembersRepo).toHaveBeenCalledTimes(1);
    expect(a.data.id).toBe(b.data.id);
  });

  it('treats names differing only by case/whitespace as the same submission', async () => {
    await Promise.all([
      createGroupService({ name: 'Thesis Team', ownerId: 'u1' }),
      createGroupService({ name: '  thesis team ', ownerId: 'u1' }),
    ]);
    expect(repo.createGroupRepo).toHaveBeenCalledTimes(1);
  });

  it('still lets different owners or different names create concurrently', async () => {
    await Promise.all([
      createGroupService({ name: 'Thesis Team', ownerId: 'u1' }),
      createGroupService({ name: 'Thesis Team', ownerId: 'u2' }),
      createGroupService({ name: 'Other', ownerId: 'u1' }),
    ]);
    expect(repo.createGroupRepo).toHaveBeenCalledTimes(3);
  });

  it('allows a deliberate second group with the same name once the first finished', async () => {
    const input = { name: 'Thesis Team', ownerId: 'u1' };
    const a = await createGroupService(input);
    const b = await createGroupService(input);
    expect(repo.createGroupRepo).toHaveBeenCalledTimes(2);
    expect(a.data.id).not.toBe(b.data.id);
  });

  it('releases the lock after a failure so a retry can succeed', async () => {
    repo.createGroupRepo.mockRejectedValueOnce(new Error('db down'));
    const input = { name: 'Thesis Team', ownerId: 'u1' };
    await expect(createGroupService(input)).rejects.toThrow('db down');
    const ok = await createGroupService(input);
    expect(ok.status).toBe(201);
  });
});

describe('CreateGroupModal – client-side submit lock', () => {
  const src = readSource('web/src/components/modals/CreateGroupModal.jsx');

  it('ignores a submit while one is already in flight', () => {
    expect(src).toMatch(/if \(submittingRef\.current\) return;/);
    expect(src).toMatch(/await onSubmit\(/);
  });

  it('disables the submit button while creating', () => {
    expect(src).toMatch(/disabled=\{submitting\}/);
  });
});
