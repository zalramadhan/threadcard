"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-black/15 dark:bg-neutral-50 dark:text-neutral-950 dark:shadow-black/40">
        {message}
      </div>
    </div>
  );
}
