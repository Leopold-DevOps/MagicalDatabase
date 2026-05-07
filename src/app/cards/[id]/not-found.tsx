import Link from "next/link";

export default function NotFound() {
  return (
    <div className="surface mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-2xl text-ink-50">Card not found</h1>
      <p className="mt-2 text-sm text-ink-400">
        The scrying glass returned naught. Try a different name.
      </p>
      <Link href="/cards" className="btn-primary mt-6">
        Back to search
      </Link>
    </div>
  );
}
