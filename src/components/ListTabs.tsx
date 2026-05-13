import Link from "next/link";
import type { ListId } from "@/types";
import { LISTS } from "@/lib/lists";

const ORDER: ListId[] = ["imdb-top-100", "letterboxd-top-500"];

export function ListTabs({
  active,
  basePath,
}: {
  active: ListId;
  /** e.g. "/u/soccerjonj" or "/together/soccerjonj/partner". */
  basePath: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
      {ORDER.map((id) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={`${basePath}?list=${id}`}
            scroll={false}
            className={[
              "rounded-full border px-4 py-1.5 text-sm transition",
              isActive
                ? "border-gold bg-gold/10 text-gold"
                : "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80",
            ].join(" ")}
          >
            {LISTS[id].title}
          </Link>
        );
      })}
    </nav>
  );
}
