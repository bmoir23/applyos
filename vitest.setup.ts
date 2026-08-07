import { vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    query: {},
  },
}));

vi.mock("@/lib/firecrawl", () => ({
  assertSafePublicUrl: vi.fn(),
  extractJobsFromCareerPage: vi.fn(),
}));

vi.mock("@/lib/services/jobs", () => ({
  getOwnedJob: vi.fn(),
  listJobs: vi.fn(),
  createJobSource: vi.fn(),
  listJobSources: vi.fn(),
  crawlJobSource: vi.fn(),
}));

vi.mock("@/lib/services/agentEvents", () => ({
  createAgentEvent: vi.fn(),
  listAgentEvents: vi.fn(),
}));

vi.mock("@/lib/services/workflows", () => ({
  startWorkflowRun: vi.fn(),
  completeWorkflowRun: vi.fn(),
  failWorkflowRun: vi.fn(),
}));
