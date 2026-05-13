export function posterUrl(
  posterPath: string | null,
  size: "w185" | "w342" | "w500" = "w342",
): string {
  if (!posterPath) {
    return "/placeholder-poster.svg";
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
