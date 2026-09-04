import { beforeEach, describe, expect, it, vi } from 'vitest';

const groupMembersChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const catalystInsertChain = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
};

vi.mock('../common/config/supabaseClient.js', () => ({
  default: {
    from: vi.fn((table) => {
      if (table === 'group_members') return groupMembersChain;
      return { select: vi.fn() };
    }),
  },
}));

vi.mock('../common/config/catalyst2SupabaseClient.js', () => ({
  default: {
    from: vi.fn(() => catalystInsertChain),
  },
}));

describe('Catalyst 2 integration service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    groupMembersChain.select.mockReturnValue(groupMembersChain);
    groupMembersChain.eq.mockImplementation(() => groupMembersChain);
    groupMembersChain.maybeSingle.mockResolvedValue({ data: { group_id: 'group-123', user_id: 'user-456' }, error: null });

    catalystInsertChain.insert.mockReturnValue(catalystInsertChain);
    catalystInsertChain.select.mockReturnValue(catalystInsertChain);
    catalystInsertChain.single.mockResolvedValue({
      data: {
        id: 'import-1',
        workspace_id: 'group-123',
        user_id: 'user-456',
        source_system: 'manual',
        import_type: 'topic_import',
        status: 'pending',
        payload_json: { source_type: 'topic_import' },
      },
      error: null,
    });
  });

  it('rejects creating an integration import when the authenticated user is not a member of the workspace', async () => {
    const { createIntegrationImportService } = await import('../modules/catalyst2/catalyst2.service.js');

    groupMembersChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      createIntegrationImportService({ workspace_id: 'group-123', import_type: 'topic_import', status: 'queued' }, 'user-999')
    ).rejects.toThrow('not a member of this workspace');
  });

  it('maps convenience request fields to the actual Catalyst 2 schema and forces JWT user id', async () => {
    const { createIntegrationImportService } = await import('../modules/catalyst2/catalyst2.service.js');

    await createIntegrationImportService(
      {
        workspace_id: 'group-123',
        user_id: 'malicious-user',
        source_system: 'manual',
        source_type: 'topic_import',
        status: 'queued',
        metadata: { source_id: 'topic-42' },
      },
      'user-456'
    );

    const insertPayload = catalystInsertChain.insert.mock.calls[0][0][0];
    expect(insertPayload.user_id).toBe('user-456');
    expect(insertPayload.import_type).toBe('topic_import');
    expect(insertPayload.status).toBe('pending');
    expect(insertPayload.payload_json).toMatchObject({ source_type: 'topic_import', source_id: 'topic-42' });
  });

  it('rejects invalid import_type values', async () => {
    const { createIntegrationImportService } = await import('../modules/catalyst2/catalyst2.service.js');

    await expect(
      createIntegrationImportService({ workspace_id: 'group-123', import_type: 'bogus' }, 'user-456')
    ).rejects.toThrow('Invalid import_type');
  });

  it('rejects invalid import status values', async () => {
    const { createIntegrationImportService } = await import('../modules/catalyst2/catalyst2.service.js');

    await expect(
      createIntegrationImportService({ workspace_id: 'group-123', import_type: 'topic_import', status: 'queued-now' }, 'user-456')
    ).rejects.toThrow('Invalid status');
  });
});
