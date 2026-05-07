import Link from "next/link";

export default function NotFound() {
  return (
    <div className="surface mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-2xl text-ink-50">Collection not found</h1>
      <p className="mt-2 text-sm text-ink-400">
        Either it doesn&apos;t exist or it isn&apos;t yours.
      </p>
      <Link href="/collections" className="btn-primary mt-6">
        Back to collections
      </Link>
    </div>
  );
}
