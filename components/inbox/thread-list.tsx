import { Badge } from "@/components/ui/badge";

type ThreadListItem = {
  id: string;
  subject: string;
  preview: string;
  fromAddress: string | null;
  receivedAt: string | null;
  classifiedStatus: string | null;
  badge?: string;
};

type ThreadListProps = {
  items: ThreadListItem[];
};

function formatWhen(value: string | null): string {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString();
}

export function ThreadList({ items }: ThreadListProps) {
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{item.subject}</p>
              <p className="text-xs text-muted-foreground">
                {item.fromAddress ? `From ${item.fromAddress}` : "Unknown sender"}
                {" · "}
                {formatWhen(item.receivedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
              {item.classifiedStatus ? (
                <Badge variant="secondary">{item.classifiedStatus}</Badge>
              ) : null}
            </div>
          </div>
          {item.preview ? (
            <p className="text-sm text-muted-foreground">{item.preview}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
