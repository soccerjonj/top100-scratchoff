import Link from "next/link";
import type { ListId } from "@/types";
import { LISTS } from "@/lib/lists";

const ORDER: ListId[] = [
  "imdb-top-100",
  "afi-top-100",
  "nyt-top-100",
  "letterboxd-top-500",
];

const SHORT_TITLE: Record<ListId, string> = {
  "imdb-top-100": "IMDB 100",
  "afi-top-100": "AFI 100",
  "nyt-top-100": "NYT 21st",
  "letterboxd-top-500": "Letterboxd 500",
};

export function ListTabs({
  active,
  basePath,
  extraParams = {},
}: {
  active: ListId;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const make = (id: ListId) => {
    const params = new URLSearchParams();
    params.set("list", id);
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    return `${basePath}?${params.toString()}`;
  };
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-4 pb-2 sm:flex-wrap sm:overflow-visible">
      {ORDER.map((id) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={make(id)}
            scroll={false}
            className={[
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:text-sm",
              isActive
                ? "border-gold bg-gold/10 text-gold"
                : "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80",
            ].join(" ")}
          >
            <span className="sm:hidden">{SHORT_TITLE[id]}</span>
            <span className="hidden sm:inline">{LISTS[id].title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
