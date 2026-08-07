import "server-only";

import { desc, eq } from "drizzle-orm";

import { calendarEvents } from "@/db/schema";
import { db } from "@/lib/db";
import { createApprovalRequest } from "@/lib/services/approvals";

type ProposeCalendarEventInput = {
  applicationId?: string;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  location?: string;
};

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(event: {
  id: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
}): string {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ApplyOS//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@applyos.me`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.startsAt)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${event.title.replace(/\n/g, " ")}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${event.location.replace(/\n/g, " ")}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export async function proposeCalendarEvent(
  userId: string,
  input: ProposeCalendarEventInput,
) {
  const [event] = await db
    .insert(calendarEvents)
    .values({
      userId,
      applicationId: input.applicationId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
    })
    .returning();

  if (!event) {
    throw new Error("Unable to create calendar event");
  }

  const icsContent = buildIcs(event);
  await db
    .update(calendarEvents)
    .set({ icsContent, updatedAt: new Date() })
    .where(eq(calendarEvents.id, event.id));

  const approval = await createApprovalRequest({
    userId,
    actionType: "create_calendar_event",
    resourceType: "calendar_event",
    resourceId: event.id,
    payload: {
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString(),
      location: event.location,
    },
    rationale: "Review this calendar event before it is shared externally.",
  });

  const [updated] = await db
    .update(calendarEvents)
    .set({
      approvalRequestId: approval.id,
      updatedAt: new Date(),
    })
    .where(eq(calendarEvents.id, event.id))
    .returning();

  if (!updated) {
    throw new Error("Unable to link calendar event approval");
  }

  return { event: updated, approval };
}

export async function listCalendarEvents(userId: string) {
  return db.query.calendarEvents.findMany({
    where: eq(calendarEvents.userId, userId),
    orderBy: [desc(calendarEvents.startsAt)],
  });
}
