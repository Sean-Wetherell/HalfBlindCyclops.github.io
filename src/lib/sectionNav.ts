/** Valid resume section ids for `?section=` deep links. */
export const SECTION_IDS = ["about", "experience", "projects"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SESSION_AUTO_ABOUT_KEY = "globesite-session-auto-about";
export const NAV_TIP_DISMISSED_KEY = "globesite-nav-tip-dismissed";

export function isSectionId(value: string | null | undefined): value is SectionId {
  return Boolean(value && (SECTION_IDS as readonly string[]).includes(value));
}

export function readSectionFromLocation(): SectionId | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("section");
  return isSectionId(raw) ? raw : null;
}

export function isDebugQueryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

/** Keep `?section=` in sync without a full navigation (static export friendly). */
export function replaceSectionInUrl(sectionId: SectionId | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (sectionId) {
    url.searchParams.set("section", sectionId);
  } else {
    url.searchParams.delete("section");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
