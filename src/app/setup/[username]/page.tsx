import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { CsvUpload } from "@/components/CsvUpload";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;

export default async function SetupPage({ params }: { params: Params }) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_-]+$/.test(username)) notFound();

  // Verify the Letterboxd profile exists + seed a record. If they've
  // already uploaded a CSV, skip the onboarding entirely.
  let user;
  try {
    user = await getOrRefreshUser(username);
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) notFound();
    throw e;
  }

  if (user.csvUploadedAt) {
    redirect(`/u/${username}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-gold"
        >
          ← change user
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, <span className="text-gold">{username}</span>
        </h1>
        <p className="text-sm text-zinc-400">
          One quick setup to import your full Letterboxd history. You only need
          to do this once. After that, every visit auto-refreshes your latest
          watches.
        </p>
      </header>

      {/* Desktop-required notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <span className="text-lg leading-none">💻</span>
        <div>
          <strong className="text-amber-400">Use a desktop computer.</strong>{" "}
          <span className="text-zinc-300">
            The Letterboxd mobile app doesn&apos;t have an export option — you
            need their website, on a laptop or desktop, to download your data.
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        <Step
          n={1}
          title="Open your Letterboxd data export"
          body={
            <>
              On a desktop browser, go to{" "}
              <a
                href="https://letterboxd.com/settings/data/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gold underline"
              >
                letterboxd.com/settings/data
              </a>
              .
            </>
          }
        />
        <Step
          n={2}
          title="Click “Export Your Data”"
          body={
            <>
              Letterboxd will give you a <code className="text-gold">.zip</code>{" "}
              file. Save it somewhere you can find again.
            </>
          }
        />
        <Step
          n={3}
          title="Unzip the file"
          body={
            <>
              Inside the zip you&apos;ll find a few CSV files. The one we need
              is <code className="text-gold">watched.csv</code>.
            </>
          }
        />
        <Step
          n={4}
          title="Upload watched.csv below"
          body={
            <CsvUpload
              username={username}
              hasCsv={false}
              variant="expanded"
              redirectTo={`/u/${username}`}
            />
          }
        />
      </ol>

      <div className="mt-2 border-t border-zinc-900 pt-4 text-center text-xs text-zinc-500">
        Can&apos;t do this right now?{" "}
        <Link
          href={`/u/${username}`}
          className="text-zinc-400 underline-offset-2 hover:text-gold hover:underline"
        >
          Skip for now and show me my last ~72 watches
        </Link>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-lg border border-zinc-900 bg-zinc-950 p-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold text-sm font-bold text-gold">
        {n}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-zinc-400">{body}</div>
      </div>
    </li>
  );
}
