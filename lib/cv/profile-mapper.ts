// lib/cv/profile-mapper.ts
type Obj = Record<string, unknown>;

const PRESENT_RE = /^(present|now|current|ongoing|hiện tại|hiện nay)$/i;

export function asObjects(v: unknown): Obj[] {
  return Array.isArray(v)
    ? (v.filter((x) => x && typeof x === "object") as Obj[])
    : [];
}

/** Chuỗi / số / mảng chuỗi -> string đã cắt độ dài, hoặc null */
export function clip(v: unknown, max: number): string | null {
  let s: string;
  if (typeof v === "string") s = v;
  else if (typeof v === "number") s = String(v);
  else if (Array.isArray(v))
    s = v.filter((x) => typeof x === "string").join("\n");
  else return null;
  s = s.trim();
  return s ? s.slice(0, max) : null;
}

/** Lấy giá trị đầu tiên tồn tại trong danh sách key */
export function pick(o: Obj, keys: string[]): unknown {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export function parseFlexibleDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || PRESENT_RE.test(str)) return null;

  let m = str.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(Number(m[1]), 0, 1));

  m = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));

  m = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Date.UTC(Number(m[2]), Number(m[1]) - 1, 1));

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  return y >= 1900 && y <= 2200 ? d : null;
}

export function mapEducations(raw: unknown, userId: string, cvId: string) {
  return asObjects(raw)
    .map((e) => ({
      userId,
      cvId,
      schoolName: clip(
        pick(e, ["school", "schoolName", "institution", "university"]),
        255
      ),
      degree: clip(pick(e, ["degree", "level"]), 100),
      major: clip(pick(e, ["major", "field", "fieldOfStudy"]), 100),
      startDate: parseFlexibleDate(
        pick(e, ["startDate", "startYear", "start"])
      ),
      endDate: parseFlexibleDate(
        pick(e, ["endDate", "endYear", "graduationYear", "end"])
      ),
      description: clip(pick(e, ["description", "details", "gpa"]), 5000),
    }))
    .filter((e): e is typeof e & { schoolName: string } => !!e.schoolName);
}

export function mapExperiences(raw: unknown, userId: string, cvId: string) {
  return asObjects(raw)
    .map((e) => {
      const startRaw = pick(e, ["startDate", "start", "from"]);
      const endRaw = pick(e, ["endDate", "end", "to"]);
      const startDate = parseFlexibleDate(startRaw);
      const endDate = parseFlexibleDate(endRaw);
      const flag = typeof e.isCurrent === "boolean" ? e.isCurrent : null;
      const isCurrent =
        flag ??
        ((endRaw !== null && PRESENT_RE.test(String(endRaw).trim())) ||
          (!endDate && !!startDate));

      return {
        userId,
        cvId,
        companyName: clip(
          pick(e, ["company", "companyName", "organization"]),
          255
        ),
        position: clip(pick(e, ["position", "title", "role", "jobTitle"]), 100),
        startDate,
        endDate: isCurrent ? null : endDate,
        description: clip(
          pick(e, [
            "description",
            "responsibilities",
            "achievements",
            "highlights",
          ]),
          5000
        ),
        isCurrent,
      };
    })
    .filter((e): e is typeof e & { companyName: string } => !!e.companyName);
}

export function mapProjects(raw: unknown, userId: string, cvId: string) {
  return asObjects(raw)
    .map((p) => {
      const tech = pick(p, ["technologies", "techStack", "tech", "tools"]);
      return {
        userId,
        cvId,
        name: clip(pick(p, ["name", "title", "projectName"]), 255),
        description: clip(
          pick(p, ["description", "details", "highlights"]),
          5000
        ),
        technologies: Array.isArray(tech)
          ? clip(tech.filter((t) => typeof t === "string").join(", "), 5000)
          : clip(tech, 5000),
        startDate: parseFlexibleDate(pick(p, ["startDate", "start"])),
        endDate: parseFlexibleDate(pick(p, ["endDate", "end"])),
        url: clip(pick(p, ["url", "link", "github"]), 255),
      };
    })
    .filter((p): p is typeof p & { name: string } => !!p.name);
}
