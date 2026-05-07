import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card-frame mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-3xl text-arcane-100">Card not found</h1>
      <p className="mt-2 text-sm text-arcane-200/80">
        The scrying glass returned naught. Perhaps try a different name.
      </p>
      <Link href="/cards" className="btn-arcane mt-6">
        Back to search
      </Link>
    </div>
  );
}
