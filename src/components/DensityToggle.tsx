import Link from "next/link";
import type { ListId } from "@/types";
import type { Density } from "./PosterGrid";

export function DensityToggle({
  density,
  basePath,
  activeList,
  extraParams = {},
}: {
  density: Density;
  basePath: string;
  activeList: ListId;
  extraParams?: Record<string, string>;
}) {
  const make = (d: Density) => {
    const params = new URLSearchParams();
    params.set("list", activeList);
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    // Default is "dense" — only encode the non-default in URLs.
    if (d !== "dense") params.set("density", d);
    return `${basePath}?${params.toString()}`;
  };
  return (
    <nav className="flex items-center gap-1 text-xs">
      <span className="text-zinc-600">Size:</span>
      {(["dense", "comfy"] as const).map((d) => {
        const active = d === density;
        return (
          <Link
            key={d}
            href={make(d)}
            scroll={false}
            className={[
              "rounded-md border px-2 py-0.5",
              active
                ? "border-gold bg-gold/10 text-gold"
                : "border-zinc-700 text-zinc-400 hover:border-gold/50",
            ].join(" ")}
          >
            {d === "comfy" ? "Comfy" : "Dense"}
          </Link>
        );
      })}
    </nav>
  );
}
