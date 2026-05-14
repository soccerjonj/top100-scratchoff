import Image from "next/image";
import type { FilmEntry } from "@/types";
import { posterUrl } from "@/lib/tmdb";

export function PosterCard({
  entry,
  watched,
}: {
  entry: FilmEntry;
  watched: boolean;
}) {
  return (
    <a
      href={`https://letterboxd.com/film/${entry.letterboxdSlug}/`}
      target="_blank"
      rel="noreferrer"
      className={[
        "poster-card group relative block aspect-[2/3] overflow-hidden rounded-md ring-1 ring-zinc-800",
        watched ? "poster-watched hover:ring-gold" : "poster-unwatched hover:opacity-90",
      ].join(" ")}
      title={`${entry.title} (${entry.year})`}
    >
      <Image
        src={posterUrl(entry.posterPath, "w342")}
        alt={`${entry.title} (${entry.year}) poster`}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 140px"
        className="object-cover"
        unoptimized={!entry.posterPath}
      />
      <div className="absolute left-0.5 top-0.5 rounded bg-black/70 px-1 py-0 text-[8px] font-semibold text-gold sm:left-1 sm:top-1 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
        #{entry.rank}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="truncate text-xs font-medium">{entry.title}</div>
        <div className="text-[10px] text-zinc-400">{entry.year}</div>
      </div>
    </a>
  );
}
