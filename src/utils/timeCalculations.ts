/**
 * Utility functions for precise TTR and Downtime calculation,
 * supporting midnight crossings and robust datetime handling.
 */

export interface TimeCalculationInput {
  reportDate: string; // YYYY-MM-DD
  reportTime?: string; // HH:mm or HH:mm:ss
  maintenanceStart?: string | null; // ISO string or YYYY-MM-DDTHH:mm or HH:mm
  maintenanceEnd?: string | null; // ISO string or YYYY-MM-DDTHH:mm or HH:mm
  restorationDate?: string | null; // ISO string or YYYY-MM-DDTHH:mm
}

export function parseFlexibleDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!dateStr) return null;

  // If dateStr already contains time (e.g. 2026-09-15T10:15:00 or 2026-09-15 10:15)
  if (dateStr.includes('T') || (dateStr.includes(' ') && dateStr.length > 11)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Pure date + separate time
  const t = timeStr && timeStr.trim().length > 0 ? timeStr.trim() : '00:00';
  const combined = `${dateStr.trim()}T${t.length === 5 ? `${t}:00` : t}`;
  const d = new Date(combined);
  if (!isNaN(d.getTime())) return d;

  // Fallback for formats like DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Check if first is year or day
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const parsed = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T${t}`);
        if (!isNaN(parsed.getTime())) return parsed;
      } else {
        // Assume DD/MM/YYYY
        const parsed = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T${t}`);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  return null;
}

/**
 * Calculates TTR (Time to Repair) in minutes.
 * Handles:
 * - Maintenance start and end as ISO datetime strings
 * - Or maintenance start/end as times (e.g. "23:50", "00:20") relative to report date,
 *   correctly handling crossing midnight (e.g., end is after midnight -> next day).
 */
export function calculateTTR(
  startStr?: string | null,
  endStr?: string | null,
  referenceDateStr?: string | null
): number {
  if (!startStr || !endStr) return 0;

  // Case 1: Both are full datetimes
  const startDate = parseFlexibleDateTime(startStr);
  const endDate = parseFlexibleDateTime(endStr);

  if (startDate && endDate) {
    let diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) {
      // If user entered only times or end crossed midnight without date increment
      if (Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
        // Add 24 hours to accommodate overnight crossing
        diffMs += 24 * 60 * 60 * 1000;
      } else {
        return 0;
      }
    }
    return Math.max(0, Math.round(diffMs / (1000 * 60)));
  }

  // Case 2: Entered as time only ("HH:mm") with reference date
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (timeRegex.test(startStr.trim()) && timeRegex.test(endStr.trim())) {
    const ref = referenceDateStr ? referenceDateStr : '2026-01-01';
    const s = new Date(`${ref}T${startStr.trim().slice(0, 5)}:00`);
    let e = new Date(`${ref}T${endStr.trim().slice(0, 5)}:00`);

    if (e.getTime() < s.getTime()) {
      // Crossed midnight! Move end to next day
      e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
    }
    const diffMin = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
    return Math.max(0, diffMin);
  }

  return 0;
}

/**
 * Calculates Downtime in minutes.
 * Downtime starts when the fault is reported, and ends when the equipment is restored
 * (or when maintenance ends if restoration is not tracked separately).
 */
export function calculateDowntime(input: TimeCalculationInput): number {
  const { reportDate, reportTime, maintenanceStart, maintenanceEnd, restorationDate } = input;
  if (!reportDate) return 0;

  const reportDt = parseFlexibleDateTime(reportDate, reportTime || '00:00');
  if (!reportDt) return 0;

  // Priority for completion: restorationDate -> maintenanceEnd -> maintenanceStart
  let completionDt: Date | null = null;

  if (restorationDate) {
    completionDt = parseFlexibleDateTime(restorationDate);
  } else if (maintenanceEnd) {
    // If maintenanceEnd is just a time string, combine with report date
    if (maintenanceEnd.includes('T') || maintenanceEnd.includes(' ')) {
      completionDt = parseFlexibleDateTime(maintenanceEnd);
    } else {
      completionDt = parseFlexibleDateTime(reportDate, maintenanceEnd);
      // Check if end is earlier than report time -> crossed midnight
      if (completionDt && completionDt.getTime() < reportDt.getTime()) {
        completionDt = new Date(completionDt.getTime() + 24 * 60 * 60 * 1000);
      }
    }
  }

  if (!completionDt) return 0;

  let diffMs = completionDt.getTime() - reportDt.getTime();
  if (diffMs < 0) {
    if (Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
      diffMs += 24 * 60 * 60 * 1000;
    } else {
      return 0;
    }
  }

  return Math.max(0, Math.round(diffMs / (1000 * 60)));
}

/**
 * Format minutes into scannable human-readable string: e.g. "2h 15m" or "45m"
 */
export function formatMinutes(minutes?: number | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes === 0) {
    return '0m';
  }
  const m = Math.round(minutes);
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
}
