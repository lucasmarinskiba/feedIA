import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface CalendarEvent {
  uid: string;
  startIso: string;
  endIso?: string;
  title: string;
  description?: string;
  location?: string;
}

const escape = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

const toIcsDate = (iso: string): string =>
  iso
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
    .replace(/Z?$/, 'Z');

export const buildIcs = (calendarName: string, events: CalendarEvent[]): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//paithon-labs//ig-agent//EN',
    `X-WR-CALNAME:${escape(calendarName)}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@ig-agent.local`);
    lines.push(`DTSTAMP:${toIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${toIcsDate(ev.startIso)}`);
    if (ev.endIso) lines.push(`DTEND:${toIcsDate(ev.endIso)}`);
    lines.push(`SUMMARY:${escape(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escape(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escape(ev.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const exportIcs = (calendarName: string, events: CalendarEvent[], outPath?: string): string => {
  const ics = buildIcs(calendarName, events);
  const fp = resolve(outPath ?? `output/calendar-${Date.now()}.ics`);
  mkdirSync(dirname(fp), { recursive: true });
  writeFileSync(fp, ics, 'utf-8');
  return fp;
};
