// Gregorian <-> tabular (civil) Hijri calendar conversion. This is the
// well-known arithmetic Islamic calendar approximation (not sighting- or
// Umm al-Qura-based) — accurate to within a day or two, which is more than
// enough precision for a family tree's birth/death dates.

const GREGORIAN_EPOCH = 1721425.5;
const ISLAMIC_EPOCH = 1948439.5;

export type YMD = { year: number; month: number; day: number };

function mod(a: number, b: number) {
  return a - b * Math.floor(a / b);
}

function leapGregorian(year: number) {
  return year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0);
}

function gregorianToJD(year: number, month: number, day: number) {
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    Math.floor((year - 1) / 4) -
    Math.floor((year - 1) / 100) +
    Math.floor((year - 1) / 400) +
    Math.floor((367 * month - 362) / 12) +
    (month <= 2 ? 0 : leapGregorian(year) ? -1 : -2) +
    day
  );
}

function jdToGregorian(jd: number): YMD {
  const wjd = Math.floor(jd - 0.5) + 0.5;
  const depoch = wjd - GREGORIAN_EPOCH;
  const quadricent = Math.floor(depoch / 146097);
  const dqc = mod(depoch, 146097);
  const cent = Math.floor(dqc / 36524);
  const dcent = mod(dqc, 36524);
  const quad = Math.floor(dcent / 1461);
  const dquad = mod(dcent, 1461);
  const yindex = Math.floor(dquad / 365);
  let year = quadricent * 400 + cent * 100 + quad * 4 + yindex;
  if (!(cent === 4 || yindex === 4)) year += 1;
  const yearday = wjd - gregorianToJD(year, 1, 1);
  const leapadj = wjd < gregorianToJD(year, 3, 1) ? 0 : leapGregorian(year) ? 1 : 2;
  const month = Math.floor(((yearday + leapadj) * 12 + 373) / 367);
  const day = wjd - gregorianToJD(year, month, 1) + 1;
  return { year, month, day };
}

function islamicToJD(year: number, month: number, day: number) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;
}

function jdToIslamic(jd: number): YMD {
  const jd2 = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (jd2 - ISLAMIC_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd2 - (29 + islamicToJD(year, 1, 1))) / 29.5) + 1);
  const day = jd2 - islamicToJD(year, month, 1) + 1;
  return { year, month, day };
}

export function gregorianToHijri(g: YMD): YMD {
  return jdToIslamic(gregorianToJD(g.year, g.month, g.day));
}

export function hijriToGregorian(h: YMD): YMD {
  return jdToGregorian(islamicToJD(h.year, h.month, h.day));
}

export const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

export const GREGORIAN_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export type PartialDate = { year?: number; month?: number; day?: number };

// The canonical stored/displayed form is always Hijri, e.g. "12 ربيع الأول
// 1445هـ", "ربيع الأول 1445هـ" (day unknown), or "1445هـ" (month unknown).
export function formatHijri(d: PartialDate): string {
  if (!d.year) return "";
  const parts: string[] = [];
  if (d.day && d.month) parts.push(String(d.day));
  if (d.month) parts.push(HIJRI_MONTHS[d.month - 1]);
  parts.push(String(d.year));
  return parts.join(" ") + "هـ";
}

// Parses a value previously produced by formatHijri. Also recognizes plain
// "YYYY", "YYYY-MM", "YYYY-MM-DD" strings (the app's old free-form Gregorian
// placeholder format) and converts them to Hijri, so dates entered before
// this feature still show up correctly.
export function parseStoredDate(value: string | null | undefined): PartialDate | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  if (raw.endsWith("هـ")) {
    const body = raw.slice(0, -2).trim();
    const yearMatch = body.match(/(\d{1,4})$/);
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[1], 10);
    const rest = body.slice(0, yearMatch.index).trim();
    if (!rest) return { year };
    const dayMatch = rest.match(/^(\d{1,2})\s+/);
    const day = dayMatch ? parseInt(dayMatch[1], 10) : undefined;
    const monthName = dayMatch ? rest.slice(dayMatch[0].length).trim() : rest;
    const monthIndex = HIJRI_MONTHS.indexOf(monthName);
    if (monthIndex === -1) return { year };
    return { year, month: monthIndex + 1, day };
  }

  const legacy = raw.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (legacy) {
    const [, y, m, d] = legacy;
    const year = parseInt(y, 10);
    const month = m ? parseInt(m, 10) : undefined;
    const day = d ? parseInt(d, 10) : undefined;
    if (month && day) return gregorianToHijri({ year, month, day });
    if (month) {
      const h = gregorianToHijri({ year, month, day: 15 });
      return { year: h.year, month: h.month };
    }
    const h = gregorianToHijri({ year, month: 7, day: 1 });
    return { year: h.year };
  }

  return null;
}
