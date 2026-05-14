import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

interface TmdbMovie {
  title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const { tmdbId } = await params;
  if (!/^\d+$/.test(tmdbId)) {
    return NextResponse.json({ error: "invalid tmdbId" }, { status: 400 });
  }
  if (!TMDB_KEY) {
    return NextResponse.json({ error: "tmdb key not configured" }, { status: 500 });
  }

  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  url.searchParams.set("api_key", TMDB_KEY);
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return NextResponse.json({ error: `tmdb returned ${res.status}` }, { status: 502 });
  }
  const json = (await res.json()) as TmdbMovie;

  // Return a trimmed shape (we don't need every field)
  const payload = {
    title: json.title,
    overview: json.overview,
    year: Number(json.release_date?.slice(0, 4) || 0) || null,
    runtime: json.runtime,
    voteAverage: json.vote_average,
    genres: json.genres.map((g) => g.name),
    tagline: json.tagline,
    posterPath: json.poster_path,
    backdropPath: json.backdrop_path,
  };

  return NextResponse.json(payload, {
    headers: {
      // TMDB metadata is stable; cache for a day at the edge.
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
