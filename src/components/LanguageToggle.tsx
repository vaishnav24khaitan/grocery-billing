"use client";

import { LANGS, type Lang } from "@/lib/i18n";

export default function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-gray-300 p-0.5"
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            lang === l.code
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
