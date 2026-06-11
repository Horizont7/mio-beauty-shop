"use client";

import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { getLocalizedVideoHighlight } from "@/lib/localized-data";
import { VideoHighlight } from "@/lib/video-highlights";

type VideoHighlightsSectionProps = {
  highlights: VideoHighlight[];
};

function HighlightCover({
  highlight,
  onOpen,
}: {
  highlight: VideoHighlight;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const { language } = useLanguage();
  const localizedHighlight = getLocalizedVideoHighlight(highlight, language);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-[108px] shrink-0 text-left sm:w-[172px]"
    >
      <div className="rounded-full bg-[linear-gradient(135deg,#EEA391,#f8e0d8,#211f1e)] p-[2px] shadow-[0_18px_50px_rgba(238,163,145,0.22)] transition duration-500 group-hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden rounded-full border-[4px] border-white bg-[#f7eee9] sm:border-[6px]">
          {highlight.cover_image ? (
            <>
              <div
                className={`absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.1),rgba(255,255,255,0.55),rgba(255,255,255,0.1))] transition-opacity duration-500 ${
                  loaded ? "opacity-0" : "animate-pulse opacity-100"
                }`}
              />
              <Image
                src={highlight.cover_image}
                alt={localizedHighlight.title}
                fill
                sizes="(min-width: 640px) 172px, 148px"
                className={`object-cover transition duration-700 group-hover:scale-105 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                quality={78}
                onLoad={() => setLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-extrabold tracking-[0.28em] text-[#B96C5C]">
              MIO
            </div>
          )}
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[9px] font-bold uppercase tracking-[0.08em] text-[#B96C5C] shadow-lg backdrop-blur sm:bottom-3 sm:right-3 sm:h-10 sm:w-10 sm:text-[10px]">
            Play
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-center text-xs font-semibold leading-4 text-[var(--brand-ink)] sm:mt-4 sm:text-sm sm:leading-5">
        {localizedHighlight.title}
      </p>
    </button>
  );
}

export default function VideoHighlightsSection({
  highlights,
}: VideoHighlightsSectionProps) {
  const [activeHighlight, setActiveHighlight] =
    useState<VideoHighlight | null>(null);
  const { language, t } = useLanguage();
  const localizedActiveHighlight = activeHighlight
    ? getLocalizedVideoHighlight(activeHighlight, language)
    : null;

  return (
    <section className="border-y border-[#f1d4cc]/70 bg-[#fffaf8] py-7 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B96C5C] sm:text-xs sm:tracking-[0.32em]">
              {t("videoBlogEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--brand-ink)] sm:mt-3 sm:text-4xl">
              {t("videoBlogHeading")}
            </h2>
          </div>
          <p className="hidden max-w-md text-sm leading-6 text-[var(--brand-muted)] sm:block">
            {t("videoBlogDescription")}
          </p>
        </div>

        {highlights.length > 0 ? (
          <div className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 sm:gap-6">
              {highlights.map((highlight) => (
                <HighlightCover
                  key={highlight.id}
                  highlight={highlight}
                  onOpen={() => setActiveHighlight(highlight)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[30px] border border-[#f1d4cc] bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-[var(--brand-ink)]">
              {t("videoBlogEmptyTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              {t("videoBlogEmptyText")}
            </p>
          </div>
        )}
      </div>

      {activeHighlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label={t("videoBlogClose")}
            className="absolute inset-0"
            onClick={() => setActiveHighlight(null)}
          />
          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[30px] bg-[#151211] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">
                {localizedActiveHighlight?.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveHighlight(null)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white hover:text-[#151211]"
              >
                {t("videoBlogClose")}
              </button>
            </div>
            {activeHighlight.video_url ? (
              <video
                src={activeHighlight.video_url}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full bg-black object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-white/70">
                {t("videoBlogMissing")}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
