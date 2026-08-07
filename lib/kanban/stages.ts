export const KANBAN_STAGES = [
  "applied",
  "follow_up_needed",
  "waiting_to_hear_back",
  "interview_scheduled",
  "interview_completed",
  "waiting_for_offer",
  "offer_pending",
  "rejected_closed",
  "hired",
] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number];

export const KANBAN_STAGE_LABELS: Record<KanbanStage, string> = {
  applied: "Applied",
  follow_up_needed: "Follow up needed",
  waiting_to_hear_back: "Waiting to hear back",
  interview_scheduled: "Interview scheduled",
  interview_completed: "Interview completed",
  waiting_for_offer: "Waiting for offer",
  offer_pending: "Offer pending",
  rejected_closed: "Rejected closed",
  hired: "Hired",
};

const LEGACY_STATUS_TO_KANBAN: Record<string, KanbanStage> = {
  interested: "applied",
  preparing: "applied",
  applied: "applied",
  interviewing: "interview_scheduled",
  assessment: "interview_completed",
  offer: "offer_pending",
  rejected: "rejected_closed",
  withdrawn: "rejected_closed",
  archived: "rejected_closed",
};

const TERMINAL_STAGES = new Set<KanbanStage>(["rejected_closed", "hired"]);

export function legacyStatusToKanbanStage(status: string): KanbanStage {
  return LEGACY_STATUS_TO_KANBAN[status] ?? "applied";
}

export function isTerminalStage(stage: KanbanStage): boolean {
  return TERMINAL_STAGES.has(stage);
}
