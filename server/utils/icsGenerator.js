// ─────────────────────────────────────────────
//  ICS Calendar File Generator
//  RFC 5545 compliant .ics output
// ─────────────────────────────────────────────
import ical from "ical-generator";

/**
 * Generate a .ics calendar string from deadline objects.
 * @param {Array<{scholarship_title, deadline, reminders}>} deadlines
 * @returns {string} — ICS file content
 */
export function generateICS(deadlines) {
  const calendar = ical({
    name: "Scholarship Deadlines",
    prodId: "//ScholarshipHunter//EN",
    timezone: "UTC",
  });

  for (const item of deadlines) {
    const deadlineDate = new Date(item.deadline);
    if (isNaN(deadlineDate.getTime())) continue;

    // Main deadline event
    calendar.createEvent({
      start: deadlineDate,
      end: new Date(deadlineDate.getTime() + 60 * 60 * 1000), // 1 hr
      summary: `DEADLINE: ${item.scholarship_title}`,
      description: `Scholarship application deadline for ${item.scholarship_title}`,
      alarms: [
        { type: "display", trigger: 14 * 24 * 60 * 60 },  // 2 weeks before
        { type: "display", trigger: 48 * 60 * 60 },         // 48 hours before
      ],
    });

    // Reminder events
    if (item.reminders && Array.isArray(item.reminders)) {
      for (const reminder of item.reminders) {
        const reminderDate = new Date(reminder);
        if (isNaN(reminderDate.getTime())) continue;
        calendar.createEvent({
          start: reminderDate,
          end: new Date(reminderDate.getTime() + 30 * 60 * 1000),
          summary: `REMINDER: ${item.scholarship_title}`,
          description: `Reminder: Application for ${item.scholarship_title} is due on ${deadlineDate.toDateString()}`,
        });
      }
    }
  }

  return calendar.toString();
}
