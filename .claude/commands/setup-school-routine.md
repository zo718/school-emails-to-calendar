---
description: Set up (or update) the School Emails → Calendar routine for your family
---

You are helping a parent set up the "School Emails → Calendar" routine from this repository. Be friendly and brief; assume they are not technical. Do the steps in order and don't skip the checks.

## 1. Check prerequisites

Confirm with the parent, and verify where you can:
- They have already done README steps 1–3: the Gmail filter and label, and the Apps Script project with `setup()` run successfully. If not, point them to the README and stop.
- The **Gmail** and **Google Calendar** connectors are connected at https://claude.ai/customize/connectors. Check that the routine-scheduling tool lists both as available connectors. If either is missing, send them to that page and wait.

## 2. Collect the values

Ask for these in one short message, with examples:
- Child's first name. Use the exact name they gave as `CHILD_NAME` in Config.gs.
- Grade, e.g. "Kindergarten", "2nd grade".
- School name, and the district name (optional).
- The block the Apps Script `setup()` printed at the end of its execution log (label, calendar names and IDs, email, time zone). Ask them to paste it.
- Reminder times for all-day events. Default: 8:00pm the evening before and 7:00am that morning.
- Run times. Default: 7:00, 12:00, 16:00 and 20:00 local time.

If they can't find the `setup()` log, look the calendars up yourself with the Google Calendar connector (`list_calendars`, matching "<Child>'s School" and "<Child>'s School – To Do"). Ask them for the label and their email directly.

Verify the label: search Gmail with `label:"<label>"` and confirm it returns their school emails. If it returns nothing, check the spelling with them.

## 3. Fill in the template

Read `ROUTINE_PROMPT.template.md` and replace every `{{PLACEHOLDER}}`:

| Placeholder | Value |
|---|---|
| `{{CHILD_NAME}}`, `{{GRADE}}`, `{{SCHOOL}}` | as given |
| `{{DISTRICT_SUFFIX}}` | ` (<district>)` with a leading space, or empty if no district |
| `{{GMAIL_LABEL}}` | exact label name |
| `{{PARENT_EMAIL}}` | their Gmail address |
| `{{TIMEZONE}}` | IANA name, e.g. `America/Chicago` |
| `{{SCHOOL_CALENDAR_NAME}}`, `{{SCHOOL_CALENDAR_ID}}`, `{{TODO_CALENDAR_NAME}}`, `{{TODO_CALENDAR_ID}}` | from the setup log |
| `{{EVENING_REMINDER_MINUTES}}` | minutes before midnight: 8pm → `240`, 9pm → `180`, 7pm → `300` |
| `{{EVENING_REMINDER_LABEL}}` | e.g. `8:00pm` |
| `{{MORNING_REMINDER_MINUTES}}` | negative minutes after midnight: 7am → `-420`, 6:30am → `-390`, 8am → `-480` |
| `{{MORNING_REMINDER_LABEL}}` | e.g. `7:00am` |
| `{{RUN_TIMES}}` | e.g. `7:00, 12:00, 16:00 and 20:00` |

Save the result as `my-routine-prompt.md` (it's in `.gitignore`, so their personal details are never committed). Search the file for `{{` to confirm nothing is left unfilled.

## 4. Create the routine

Use the schedule skill (`/schedule`) to create a routine with:
- **Name:** `<Child>'s school emails → Calendar`
- **Schedule:** the run times converted to a UTC cron expression. Tell them the conversion, and that the local times shift by an hour when daylight saving time changes.
- **Model:** `claude-opus-5-5`. It's noticeably more thorough with long newsletters than smaller models.
- **Connectors:** Gmail and Google Calendar.
- **Repository:** none.
- **Prompt:** the full contents of `my-routine-prompt.md`.

If a routine with that name already exists, update it rather than creating a second one.

## 5. Test it

Run the routine once now. When it finishes, read its log and tell the parent in plain words:
- which emails it read,
- what it added to the calendar, and which to-dos became tasks,
- whether it sent a summary email.

Fix anything that went wrong, such as a wrong label or calendar ID.

## 6. Wrap up

Remind them:
- **Share the school calendar** with their co-parent (Google Calendar → the calendar's ⋮ → Settings and sharing). The co-parent needs to set their own notifications there.
- **Tasks** are in the Google Tasks list "<Child>'s School".
- **Pause it over summer and school breaks** at https://claude.ai/code/routines.
- **To change anything later**, they can just run `/setup-school-routine` again.
