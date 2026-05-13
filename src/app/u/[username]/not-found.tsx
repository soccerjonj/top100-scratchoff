import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">User not found</h1>
      <p className="text-zinc-400">
        That Letterboxd profile doesn&apos;t exist or is private. Double-check
        the spelling.
      </p>
      <Link href="/" className="text-gold underline">
        Try another username
      </Link>
    </main>
  );
}
