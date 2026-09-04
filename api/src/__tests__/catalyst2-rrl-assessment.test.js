import { beforeEach, describe, expect, it, vi } from 'vitest';

const groupMembersChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const gapChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const topicChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const integrationImportChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const rrlInsertChain = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
};

vi.mock('../common/config/supabaseClient.js', () => ({
  default: {
    from: vi.fn((table) => {
      if (table === 'group_members') return groupMembersChain;
      if (table === 'GapResult') return gapChain;
      if (table === 'Topic') return topicChain;
      return { select: vi.fn() };
    }),
  },
}));

vi.mock('../common/config/catalyst2SupabaseClient.js', () => ({
  default: {
    from: vi.fn((table) => {
      if (table === 'integration_imports') return integrationImportChain;
      if (table === 'rrl_assessments') return rrlInsertChain;
      return { select: vi.fn() };
    }),
  },
}));

describe('Catalyst 2 RRL assessment service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    groupMembersChain.select.mockReturnValue(groupMembersChain);
    groupMembersChain.eq.mockImplementation(() => groupMembersChain);
    groupMembersChain.maybeSingle.mockResolvedValue({ data: { group_id: 'workspace-123', user_id: 'user-456' }, error: null });

    gapChain.select.mockReturnValue(gapChain);
    gapChain.eq.mockImplementation(() => gapChain);
    gapChain.maybeSingle.mockResolvedValue({ data: { id: 'gap-1', group_id: 'workspace-123' }, error: null });

    topicChain.select.mockReturnValue(topicChain);
    topicChain.eq.mockImplementation(() => topicChain);
    topicChain.maybeSingle.mockResolvedValue({ data: { id: 'topic-1', group_id: 'workspace-123' }, error: null });

    integrationImportChain.select.mockReturnValue(integrationImportChain);
    integrationImportChain.eq.mockImplementation(() => integrationImportChain);
    integrationImportChain.maybeSingle.mockResolvedValue({ data: { id: 'import-1', workspace_id: 'workspace-123', user_id: 'user-456' }, error: null });

    rrlInsertChain.insert.mockReturnValue(rrlInsertChain);
    rrlInsertChain.select.mockReturnValue(rrlInsertChain);
    rrlInsertChain.single.mockResolvedValue({
      data: {
        id: 'rrl-1',
        workspace_id: 'workspace-123',
        user_id: 'user-456',
        assessment_status: 'pending',
        recency_score: 0.9,
      },
      error: null,
    });
  });

  it('allows an authenticated user to create an RRL assessment for their workspace', async () => {
    const { createRrlAssessmentService } = await import('../modules/catalyst2/catalyst2.service.js');

    const result = await createRrlAssessmentService(
      {
        workspace_id: 'workspace-123',
        gap_id: 'gap-1',
        topic_id: 'topic-1',
        document_ref: 'doc-123',
        assessment_status: 'pending',
        recency_score: 0.9,
        methodology_alignment_score: 0.8,
        contribution_significance_score: 0.7,
        thematic_relevance_score: 0.6,
        overall_relevance_score: 0.75,
        score_summary: { overall: 'strong' },
        raw_result_json: { source: 'manual' },
      },
      'user-456'
    );

    expect(result.user_id).toBe('user-456');
    expect(result.workspace_id).toBe('workspace-123');
    expect(result.assessment_status).toBe('pending');
  });

  it('rejects unauthorized workspace access', async () => {
    const { createRrlAssessmentService } = await import('../modules/catalyst2/catalyst2.service.js');

    groupMembersChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      createRrlAssessmentService(
        {
          workspace_id: 'workspace-999',
          assessment_status: 'pending',
          recency_score: 0.5,
        },
        'user-456'
      )
    ).rejects.toThrow('not a member of this workspace');
  });

  it('rejects invalid assessment_status values', async () => {
    const { createRrlAssessmentService } = await import('../modules/catalyst2/catalyst2.service.js');

    await expect(
      createRrlAssessmentService(
        {
          workspace_id: 'workspace-123',
          assessment_status: 'not_a_real_state',
          recency_score: 0.5,
        },
        'user-456'
      )
    ).rejects.toThrow('Invalid assessment_status');
  });

  it('rejects scores below 0 or above 1', async () => {
    const { createRrlAssessmentService } = await import('../modules/catalyst2/catalyst2.service.js');

    await expect(
      createRrlAssessmentService(
        {
          workspace_id: 'workspace-123',
          assessment_status: 'pending',
          recency_score: -0.1,
        },
        'user-456'
      )
    ).rejects.toThrow('recency_score must be between 0 and 1');

    await expect(
      createRrlAssessmentService(
        {
          workspace_id: 'workspace-123',
          assessment_status: 'pending',
          recency_score: 1.1,
        },
        'user-456'
      )
    ).rejects.toThrow('recency_score must be between 0 and 1');
  });

  it('uses JWT user id instead of request user_id', async () => {
    const { createRrlAssessmentService } = await import('../modules/catalyst2/catalyst2.service.js');

    await createRrlAssessmentService(
      {
        workspace_id: 'workspace-123',
        user_id: 'hacker-user',
        assessment_status: 'pending',
        recency_score: 0.5,
      },
      'user-456'
    );

    const inserted = rrlInsertChain.insert.mock.calls[0][0][0];
    expect(inserted.user_id).toBe('user-456');
    expect(inserted.user_id).not.toBe('hacker-user');
  });

  it('rejects invalid objective_type, priority, and objective status values', async () => {
    const { createSmartObjectiveService } = await import('../modules/catalyst2/catalyst2.service.js');

    await expect(
      createSmartObjectiveService({ workspace_id: 'workspace-123', objective_type: 'invalid', priority: 'medium', status: 'draft' }, 'user-456')
    ).rejects.toThrow('Invalid objective_type');

    await expect(
      createSmartObjectiveService({ workspace_id: 'workspace-123', objective_type: 'research', priority: 'urgent', status: 'draft' }, 'user-456')
    ).rejects.toThrow('Invalid priority');

    await expect(
      createSmartObjectiveService({ workspace_id: 'workspace-123', objective_type: 'research', priority: 'medium', status: 'archived-now' }, 'user-456')
    ).rejects.toThrow('Invalid status');
  });

  it('requires workspace authorization before listing smart objectives', async () => {
    const { fetchSmartObjectivesByWorkspaceService } = await import('../modules/catalyst2/catalyst2.service.js');

    groupMembersChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      fetchSmartObjectivesByWorkspaceService('workspace-123', 'user-456')
    ).rejects.toThrow('not a member of this workspace');
  });
});
