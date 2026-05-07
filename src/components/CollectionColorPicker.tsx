import {
  COLLECTION_COLORS,
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_COLOR_LABEL,
  type CollectionColor,
} from "@/lib/collections";

export function CollectionColorPicker({
  defaultValue = "arcane",
}: {
  defaultValue?: CollectionColor;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wider text-ink-400">
        Banner color
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COLLECTION_COLORS.map((c) => (
          <label
            key={c}
            className="group relative cursor-pointer rounded-lg border border-ink-700/60 bg-ink-950/40 p-2 transition hover:border-violet-400/50 has-[input:checked]:border-violet-400 has-[input:checked]:shadow-glow"
          >
            <input
              type="radio"
              name="color"
              value={c}
              defaultChecked={c === defaultValue}
              className="peer sr-only"
              required
            />
            <div
              className={`h-10 w-full rounded-md bg-gradient-to-br ${COLLECTION_COLOR_GRADIENT[c]}`}
              aria-hidden
            />
            <p className="mt-1.5 text-center text-[11px] text-ink-300 peer-checked:text-white">
              {COLLECTION_COLOR_LABEL[c]}
            </p>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
