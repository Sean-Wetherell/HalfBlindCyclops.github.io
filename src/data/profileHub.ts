import { publicPath } from "@/lib/basePath";

export type ProfileContactIcon = "map" | "mail" | "phone" | "link" | "file" | "school";

/** Plain rows (no menu, no links). */
export type ProfileHubStaticRow = {
  id: string;
  variant: "static";
  listLabel: string;
  detail?: string;
  icon: ProfileContactIcon;
};

/** Opens action menu: copy + mailto / tel / open as configured. */
export type ProfileHubInteractiveRow = {
  id: string;
  variant: "interactive";
  listLabel: string;
  icon: ProfileContactIcon;
  copyValue: string;
  mailtoHref?: string;
  telHref?: string;
  openHref?: string;
};

export type ProfileHubRow = ProfileHubStaticRow | ProfileHubInteractiveRow;

export const PROFILE_DISPLAY_NAME = "Sean Wetherell";
export const PROFILE_TAGLINE = "CS @ Northeastern University · Boston, MA";

/** Served from `/public/headshot.webp`. */
export const PROFILE_IMAGE_SRC: string | null = publicPath("/headshot.webp");

export const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/sean-wetherell/";
export const PROFILE_EMAIL = "seanwwetherell@gmail.com";
export const PROFILE_EMAIL_MAILTO = `mailto:${PROFILE_EMAIL}`;
export const PROFILE_RESUME_PDF_PATH = publicPath("/sean-wetherell-resume.pdf");
export const PROFILE_PHONE_DISPLAY = "+1 (781) 800-1653";
export const PROFILE_PHONE_TEL = "tel:+17818001653";

/** Contact actions first, then a single credentials line (no street address). */
export const profileHubRows: ProfileHubRow[] = [
  {
    id: "email",
    variant: "interactive",
    listLabel: "Email",
    icon: "mail",
    copyValue: PROFILE_EMAIL,
    mailtoHref: PROFILE_EMAIL_MAILTO,
  },
  {
    id: "linkedin",
    variant: "interactive",
    listLabel: "LinkedIn",
    icon: "link",
    copyValue: LINKEDIN_PROFILE_URL,
    openHref: LINKEDIN_PROFILE_URL,
  },
  {
    id: "resume",
    variant: "interactive",
    listLabel: "Resume PDF",
    icon: "file",
    copyValue: "",
    openHref: PROFILE_RESUME_PDF_PATH,
  },
  {
    id: "phone",
    variant: "interactive",
    listLabel: "Phone",
    icon: "phone",
    copyValue: PROFILE_PHONE_DISPLAY,
    telHref: PROFILE_PHONE_TEL,
  },
  {
    id: "credentials",
    variant: "static",
    listLabel: "Northeastern · B.S. CS · Boston, MA",
    detail: "Jan 2021 – May 2026 · expected",
    icon: "school",
  },
];
