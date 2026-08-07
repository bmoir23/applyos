"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { moveKanbanStageAction } from "@/app/(app)/applications/actions";
import { KanbanCard } from "@/components/kanban/card";
import {
  KANBAN_STAGE_LABELS,
  KANBAN_STAGES,
  type KanbanStage,
} from "@/lib/kanban/stages";

const BOARD_STAGES = KANBAN_STAGES.filter(
  (stage) => stage !== "rejected_closed" && stage !== "hired",
);
const TERMINAL_STAGES: KanbanStage[] = ["rejected_closed", "hired"];

export type KanbanApplication = {
  id: string;
  title: string;
  companyName: string;
  kanbanStage: KanbanStage;
  followUpAt: string | null;
};

type KanbanBoardProps = {
  applications: KanbanApplication[];
};

function groupByStage(applications: KanbanApplication[]) {
  const grouped = Object.fromEntries(
    KANBAN_STAGES.map((stage) => [stage, [] as KanbanApplication[]]),
  ) as Record<KanbanStage, KanbanApplication[]>;

  for (const application of applications) {
    grouped[application.kanbanStage]?.push(application);
  }
  return grouped;
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const router = useRouter();
  const [movingId, setMovingId] = useState<string | null>(null);
  const grouped = groupByStage(applications);

  async function moveApplication(applicationId: string, stage: KanbanStage) {
    setMovingId(applicationId);
    const result = await moveKanbanStageAction({ applicationId, stage });
    setMovingId(null);
    if (!result.success) {
      toast.error(result.error ?? "Unable to move application");
      return;
    }
    toast.success(`Moved to ${KANBAN_STAGE_LABELS[stage]}`);
    router.refresh();
  }

  function renderColumn(stage: KanbanStage) {
    const cards = grouped[stage];
    return (
      <section
        key={stage}
        aria-label={KANBAN_STAGE_LABELS[stage]}
        className="flex min-w-[16rem] flex-1 flex-col gap-3 rounded-xl border bg-muted/20 p-3"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{KANBAN_STAGE_LABELS[stage]}</h2>
          <span className="text-xs text-muted-foreground">{cards.length}</span>
        </header>
        <div className="flex flex-col gap-2">
          {cards.length === 0 ? (
            <p className="text-xs text-muted-foreground">No applications</p>
          ) : (
            cards.map((application) => (
              <KanbanCard
                key={application.id}
                application={application}
                isMoving={movingId === application.id}
                onMove={(nextStage) =>
                  moveApplication(application.id, nextStage)
                }
              />
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        role="region"
        aria-label="Application kanban board"
      >
        {BOARD_STAGES.map(renderColumn)}
        {TERMINAL_STAGES.map(renderColumn)}
      </div>
    </div>
  );
}
