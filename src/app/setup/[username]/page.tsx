import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, getUser, normalizeUsername } from "@/lib/user";
import {
  LetterboxdNotFoundError,
  letterboxdUserExists,
} from "@/lib/letterboxd";
import { CsvUpload } from "@/components/CsvUpload";
import { ClaimGuestButton } from "./ClaimGuestButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;

export default async function SetupPage({ params }: { params: Params }) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_-]+$/.test(username)) notFound();

  // Collision case: a guest claimed this nickname earlier. If a real
  // Letterboxd profile now exists at the same name, offer a takeover.
  // Otherwise the guest keeps using the manual-tracking flow at /u/.
  const preExisting = await getUser(username);
  if (preExisting?.isGuest) {
    const realLbProfile = await letterboxdUserExists(username);
    if (realLbProfile) {
      return <TakeoverScreen username={username} />;
    }
    // Just a guest — let them through to their own grid.
    redirect(`/u/${username}`);
  }

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

function TakeoverScreen({ username }: { username: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-xs text-zinc-500 hover:text-gold">
        ← change user
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Heads up about <span className="text-gold">{username}</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Someone else already created a guest profile with this nickname
          (and never connected it to Letterboxd). Since{" "}
          <code className="text-gold">letterboxd.com/{username}</code> is a
          real account, if that&apos;s you, you can claim this nickname now.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="text-zinc-300">
          <strong className="text-amber-400">Claiming will:</strong>
        </p>
        <ul className="ml-5 list-disc text-xs text-zinc-400">
          <li>
            Convert this profile to your real Letterboxd account
          </li>
          <li>
            Wipe any manual &ldquo;watched&rdquo; marks the guest added
            (they aren&apos;t yours)
          </li>
          <li>
            Scrape your last ~72 Letterboxd watches as a starting point
          </li>
        </ul>
      </div>

      <ClaimGuestButton username={username} />

      <p className="text-xs text-zinc-500">
        Not you?{" "}
        <Link
          href="/"
          className="text-zinc-400 underline-offset-2 hover:text-gold hover:underline"
        >
          Pick a different username
        </Link>
        . The current guest will keep using this nickname.
      </p>
    </main>
  );
}
