"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { KanbanApplication } from "@/components/kanban/board";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KANBAN_STAGE_LABELS,
  KANBAN_STAGES,
  type KanbanStage,
} from "@/lib/kanban/stages";

type KanbanCardProps = {
  application: KanbanApplication;
  isMoving: boolean;
  onMove: (stage: KanbanStage) => void;
};

function formatFollowUp(value: string | null) {
  if (!value) return "No follow-up scheduled";
  return `Follow up ${new Date(value).toLocaleString()}`;
}

export function KanbanCard({ application, isMoving, onMove }: KanbanCardProps) {
  const moveTargets = KANBAN_STAGES.filter(
    (stage) => stage !== application.kanbanStage,
  );

  return (
    <article className="rounded-lg border bg-background p-3 shadow-xs">
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium leading-snug">
            <Link
              href={`/applications/${application.id}`}
              className="hover:underline"
            >
              {application.title}
            </Link>
          </h3>
          <p className="text-xs text-muted-foreground">
            {application.companyName}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFollowUp(application.followUpAt)}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between"
                disabled={isMoving}
                aria-label={`Move ${application.title}`}
              />
            }
          >
            {isMoving ? "Moving…" : "Move to…"}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {moveTargets.map((stage) => (
              <DropdownMenuItem key={stage} onClick={() => onMove(stage)}>
                {KANBAN_STAGE_LABELS[stage]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
