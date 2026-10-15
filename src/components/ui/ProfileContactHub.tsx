"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  PROFILE_DISPLAY_NAME,
  PROFILE_IMAGE_SRC,
  PROFILE_TAGLINE,
  profileHubRows,
  type ProfileContactIcon,
  type ProfileHubInteractiveRow,
  type ProfileHubRow,
} from "@/data/profileHub";
import { ACCENT_COLOR_HEX, colorToRgba } from "@/lib/colorFormat";
import { SURFACE_SHELL_DARK } from "@/lib/uiSurfaces";

function Icon({ type, className }: { type: ProfileContactIcon; className?: string }) {
  const cn = className ?? "h-4 w-4 shrink-0 text-slate-200";
  switch (type) {
    case "school":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "map":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.25" />
        </svg>
      );
    case "mail":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "phone":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path
            d="M6.5 4h3l1.5 4-2 1.5a12 12 0 006.5 6.5l1.5-2 4 1.5v3a1 1 0 01-1 1A17 17 0 016.5 5a1 1 0 011-1z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "link":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M10 13a5 5 0 010-7l1-1a5 5 0 017 7l-1 1M14 11a5 5 0 010 7l-1 1a5 5 0 01-7-7l1-1" strokeLinecap="round" />
        </svg>
      );
    case "file":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function StaticRow({ row }: { row: Extract<ProfileHubRow, { variant: "static" }> }) {
  return (
    <div className="flex items-start gap-2.5 px-2 py-2.5 text-left text-sm text-slate-200">
      <Icon type={row.icon} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="leading-snug text-slate-300">{row.listLabel}</p>
        {row.detail ? <p className="mt-0.5 text-xs leading-snug text-slate-500">{row.detail}</p> : null}
      </div>
    </div>
  );
}

function resolveCopyValue(contact: ProfileHubInteractiveRow): string {
  if (contact.id === "resume" && typeof window !== "undefined") {
    return `${window.location.origin}${contact.openHref ?? ""}`;
  }
  return contact.copyValue;
}

function InteractiveRow({
  contact,
  copiedAction,
  setCopiedAction,
}: {
  contact: ProfileHubInteractiveRow;
  copiedAction: string | null;
  setCopiedAction: (v: string | null) => void;
}) {
  const copy = useCallback(async () => {
    const text = resolveCopyValue(contact);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAction(`${contact.id}-copy`);
      window.setTimeout(() => setCopiedAction(null), 2000);
    } catch {
      /* ignore */
    }
  }, [contact, setCopiedAction]);

  const hasMailto = Boolean(contact.mailtoHref);
  const hasTel = Boolean(contact.telHref);
  const hasOpen = Boolean(contact.openHref);
  const primaryHref = contact.mailtoHref ?? contact.telHref ?? contact.openHref;
  const opensExternal = Boolean(contact.openHref && !contact.mailtoHref && !contact.telHref);

  const rowClass =
    "flex min-h-11 items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.04] px-2.5 py-2 text-left text-sm text-slate-100 transition hover:border-white/35 hover:bg-white/[0.08]";

  const iconBtnClass =
    "profile-hub-accent-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 text-slate-200 transition hover:border-white/35 hover:bg-white/10";

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const primaryLabel =
    contact.id === "email"
      ? "Compose email"
      : contact.id === "phone"
        ? "Call phone"
        : contact.id === "resume"
          ? "Open resume"
          : `Open ${contact.listLabel}`;

  const labelBlock = (
    <>
      <Icon type={contact.icon} />
      <span className="min-w-0 flex-1 truncate font-medium">{contact.listLabel}</span>
    </>
  );

  const copyButton = resolveCopyValue(contact) ? (
    <button
      type="button"
      onClick={(event) => {
        stop(event);
        void copy();
      }}
      className={iconBtnClass}
      title={copiedAction === `${contact.id}-copy` ? "Copied" : `Copy ${contact.listLabel}`}
      aria-label={copiedAction === `${contact.id}-copy` ? `${contact.listLabel} copied` : `Copy ${contact.listLabel}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <rect x="4" y="4" width="11" height="11" rx="2" />
      </svg>
    </button>
  ) : null;

  const secondaryOpen =
    contact.id === "resume" && hasOpen ? (
      <a
        href={contact.openHref}
        download="Sean_Wetherell_Resume.pdf"
        onClick={stop}
        className={iconBtnClass}
        title="Download resume"
        aria-label="Download resume"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M12 3v11" strokeLinecap="round" />
          <path d="M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19h14" strokeLinecap="round" />
        </svg>
      </a>
    ) : null;

  if (primaryHref) {
    return (
      <div className={rowClass}>
        <a
          href={primaryHref}
          target={opensExternal ? "_blank" : undefined}
          rel={opensExternal ? "noreferrer noopener" : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          title={primaryLabel}
          aria-label={primaryLabel}
        >
          {labelBlock}
        </a>
        {secondaryOpen}
        {copyButton}
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5">{labelBlock}</div>
      {!hasMailto && !hasTel && !hasOpen ? copyButton : null}
    </div>
  );
}

export function ProfileContactHub() {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
  const showPhoto = Boolean(PROFILE_IMAGE_SRC) && !photoFailed;
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const updateScrollMetrics = useCallback(() => {
    const el = cardScrollRef.current;
    if (!el) return;
    setHasVerticalScroll(el.scrollHeight > Math.ceil(el.clientHeight));
  }, []);

  useLayoutEffect(() => {
    const el = cardScrollRef.current;
    if (!el) return;
    updateScrollMetrics();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      updateScrollMetrics();
      raf2 = requestAnimationFrame(updateScrollMetrics);
    });
    const ro = new ResizeObserver(updateScrollMetrics);
    ro.observe(el);
    el.addEventListener("scroll", updateScrollMetrics, { passive: true });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollMetrics);
    };
  }, [updateScrollMetrics]);

  const cardScrollClass =
    `max-h-[min(72dvh,calc(100dvh-5.5rem))] overflow-x-hidden overscroll-contain p-[var(--surface-pad-sm)] ${SURFACE_SHELL_DARK} ` +
    (hasVerticalScroll
      ? "overflow-y-scroll resume-panel-scroll-accent "
      : "overflow-y-auto ");

  const interactiveRows = profileHubRows.filter((row) => row.variant === "interactive");
  const staticRows = profileHubRows.filter((row) => row.variant === "static");

  return (
    <header
      className="pointer-events-auto absolute left-4 top-4 z-50 max-w-[min(92vw,18rem)] text-left md:left-8 md:top-8 md:max-w-[19rem]"
      style={
        {
          ["--hub-accent-border-hover" as string]: colorToRgba(ACCENT_COLOR_HEX, 0.55),
          ["--hub-accent-bg-hover" as string]: colorToRgba(ACCENT_COLOR_HEX, 0.12),
          ["--hub-accent-text-hover" as string]: colorToRgba(ACCENT_COLOR_HEX, 0.95),
          ["--hub-avatar-accent" as string]: colorToRgba(ACCENT_COLOR_HEX, 0.35),
          ["--hub-initials" as string]: colorToRgba(ACCENT_COLOR_HEX, 0.92),
        } as CSSProperties
      }
    >
      <div
        ref={cardScrollRef}
        className={cardScrollClass}
        style={
          hasVerticalScroll
            ? ({ ["--resume-scroll-thumb" as string]: ACCENT_COLOR_HEX } as CSSProperties)
            : undefined
        }
      >
        <div className="flex gap-3">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20"
            style={{
              background: "linear-gradient(to bottom right, var(--hub-avatar-accent), rgb(15 23 42))",
            }}
          >
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- /public asset; static export uses img not next/image
              <img
                src={PROFILE_IMAGE_SRC!}
                alt={PROFILE_DISPLAY_NAME}
                width={56}
                height={56}
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <span
                className="text-sm font-semibold tracking-tight"
                style={{
                  fontFamily: "var(--font-orbitron), sans-serif",
                  color: "var(--hub-initials)",
                }}
                aria-hidden
              >
                SW
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1
              className="text-xl font-bold leading-tight tracking-wide text-white md:text-2xl"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              {PROFILE_DISPLAY_NAME}
            </h1>
            <p className="mt-1 text-xs leading-snug text-slate-400 md:text-[13px]">{PROFILE_TAGLINE}</p>
          </div>
        </div>

        <nav className="mt-4 border-t border-white/10 pt-3" aria-label="Profile and contact">
          <ul className="space-y-2">
            {interactiveRows.map((row) => (
              <li key={row.id}>
                <InteractiveRow
                  contact={row}
                  copiedAction={copiedAction}
                  setCopiedAction={setCopiedAction}
                />
              </li>
            ))}
          </ul>
          {staticRows.length > 0 ? (
            <ul className="mt-3 space-y-0.5 border-t border-white/10 pt-2">
              {staticRows.map((row) => (
                <li key={row.id}>
                  <StaticRow row={row} />
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
