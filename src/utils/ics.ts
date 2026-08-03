import type ScheduleResponse from "../../types/scheduleResponse";
import type ClassItem from "../../types/classItem";

const DAY_TO_WEEKDAY: Record<string, number> = {
  SEGUNDA: 1,
  TERÇA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SÁBADO: 6,
};

function parseBrazilDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [day, month, year] = dateStr.split("/").map(Number);
  return { year, month, day };
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// First calendar date on/after (year, month, day) that falls on targetWeekday.
function firstOccurrence(
  year: number,
  month: number,
  day: number,
  targetWeekday: number
): { year: number; month: number; day: number } {
  const offset = (targetWeekday - weekdayOf(year, month, day) + 7) % 7;
  const d = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

// Brazil has used a fixed UTC-3 offset (no DST) since 2019.
function brazilLocalToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

function formatIcsInstant(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// RFC 5545 recommends folding lines at 75 octets, continuation lines start
// with a single space. Fold by UTF-8 byte length, not char count, since
// ementa/professor text is accented Portuguese.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const maxBytes = 74;
  let result = "";
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (bytes + chBytes > maxBytes) {
      result += current + "\r\n ";
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += chBytes;
  }
  return result + current;
}

function sanitizeForUid(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
}

// Stable per class-slot (subject + turma + day + start time), deliberately
// excluding the room: if the room changes on a later export, the UID stays
// the same and calendar apps update the existing event instead of
// duplicating it.
function buildUid(item: ClassItem, day: string): string {
  const [hour, minute] = item.startTime.split(":");
  return `${sanitizeForUid(item.subjectCode)}-${sanitizeForUid(
    item.class
  )}-${sanitizeForUid(day)}-${hour}${minute}@ufmg-salas`;
}

export function generateIcs(schedule: ScheduleResponse): string {
  const start = parseBrazilDate(schedule.initialDate);
  const end = parseBrazilDate(schedule.finalDate);
  const until = formatIcsInstant(
    brazilLocalToUtcDate(end.year, end.month, end.day, 23, 59)
  );
  const dtstamp = formatIcsInstant(new Date());

  const eventLines: string[] = [];

  for (const dayObj of schedule.schedule) {
    for (const [day, classItems] of Object.entries(dayObj)) {
      const weekday = DAY_TO_WEEKDAY[day];
      if (weekday === undefined) continue;

      for (const item of classItems) {
        const occurrence = firstOccurrence(
          start.year,
          start.month,
          start.day,
          weekday
        );
        const [startHour, startMinute] = item.startTime.split(":").map(Number);
        const [endHour, endMinute] = item.endTime.split(":").map(Number);

        const dtstart = formatIcsInstant(
          brazilLocalToUtcDate(
            occurrence.year,
            occurrence.month,
            occurrence.day,
            startHour,
            startMinute
          )
        );
        const dtend = formatIcsInstant(
          brazilLocalToUtcDate(
            occurrence.year,
            occurrence.month,
            occurrence.day,
            endHour,
            endMinute
          )
        );

        const professors = item.professor.filter(Boolean);
        const descriptionParts = [
          `Código: ${item.subjectCode}`,
          professors.length ? `Professor(es): ${professors.join(", ")}` : null,
          `Turma: ${item.class}`,
          item.description || null,
        ].filter((part): part is string => Boolean(part));

        eventLines.push(
          ...[
            "BEGIN:VEVENT",
            `UID:${buildUid(item, day)}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
            `SUMMARY:${escapeIcsText(item.subjectName)}`,
            `LOCATION:${escapeIcsText(item.location)}`,
            `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`,
            "END:VEVENT",
          ].map(foldLine)
        );
      }
    }
  }

  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UFMG Salas//Grade//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventLines,
    "END:VCALENDAR",
  ];

  return calendarLines.join("\r\n");
}
