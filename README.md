# School Emails → Calendar 🎒

Never miss "wear purple on Friday", "PJ day", or "send $5 for the book fair" again.

This project reads your child's school emails and turns them into calendar events and a to-do list. That includes newsletters and flyers sent as images or PDFs.

- 📅 **Things to know or attend** (dress-up days, no-school days, picture day, concerts) go on a **shared Google Calendar**, with alerts the evening before and the morning of.
- ✔️ **Things to do** (send money, return a form, RSVP) go on a **Google Tasks** checklist you tick off.
- 🔁 **Duplicates, reschedules and cancellations** are handled automatically.
- 📬 A short **summary email** arrives only when something new shows up.

It runs on **your own Claude subscription and your own Google account**. There are no servers, no API keys and nothing to pay beyond what you already have, and your family's emails never pass through anyone else's system.

---

## Contents

1. [How it works](#1-how-it-works)
2. [What you need](#2-what-you-need)
3. [Setup (about 20–30 minutes)](#3-setup-about-2030-minutes)
4. [Day to day](#4-day-to-day)
5. [What goes where](#5-what-goes-where)
6. [Customizing](#6-customizing)
7. [Troubleshooting](#7-troubleshooting)
8. [Limitations](#8-limitations)
9. [Privacy](#9-privacy)
10. [Files](#10-files)

---

## 1. How it works

```
 School / teacher / PTA / district emails
                │
                ▼
 Gmail filter ──► your school label
                │
                ├───────────────────────────────────────────┐
                ▼                                           ▼
 Apps Script in your Google account            Claude routine (cloud, a few times a day)
 • every hour: reads image/PDF attachments     • reads the last 3 days of labeled email
   (OCR) and emails you the text, labeled      • decides what matters for your child
 • every 15 min: syncs to-dos ⇄ Google Tasks   • checks for duplicates and changes
                                               • adds, moves or cancels items
                                               • emails you a summary and any errors
                                                    │                       │
                                         know / attend                 to do (DUE:)
                                                    ▼                       ▼
                                  "<Child>'s School" calendar   hidden "<Child>'s School – To Do"
                                  (shared, with alerts)               │ synced by the Apps Script
                                                                      ▼
                                                        Google Tasks "<Child>'s School"
```

There are three parts:

1. **A Claude routine** does the reading and judging. It's a scheduled Claude Code agent that runs in Anthropic's cloud on your Claude plan and uses the Gmail and Google Calendar connectors. Its instructions are `ROUTINE_PROMPT.template.md`, filled in with your details.
2. **An attachment reader** (`apps-script/AttachmentText.gs`). The routine's Gmail connector can't open attachments, so this Google Apps Script turns image and PDF attachments into text emails the routine can read.
3. **A tasks sync** (`apps-script/DueTasks.gs`). The routine can't create Google Tasks directly, so it writes to-dos to a hidden calendar and this script mirrors them into your task list. When you tick a task off, it marks the item done so it's never re-added.

The routine **has no memory between runs**. The two calendars are its record of what's already been added. That's why the hidden To Do calendar exists.

---

## 2. What you need

- A **Google account** (Gmail, Calendar, Tasks).
- A **Claude plan that includes Claude Code routines** (scheduled cloud agents), with the **Gmail** and **Google Calendar** connectors available at https://claude.ai/customize/connectors.
- Optional: **Claude Code** on your computer, to use the guided `/setup-school-routine` command. Without it, you can create the routine on the web (step 5B).

---

## 3. Setup (about 20–30 minutes)

### Step 1: Gmail filter and label

All of your child's school email needs one Gmail label. The routine only reads emails with that label.

1. Gmail → ⚙️ **Settings** → **See all settings** → **Filters and Blocked Addresses** → **Create a new filter**.
2. In **From**, list the school senders, e.g. `yourdistrict.org OR parentsquare.com OR teacher@… OR classparent@…`. Many schools use services like ParentSquare, Remind, ClassDojo, Smore or SchoolMessenger, so include those domains.
3. **Create filter** → tick **Apply the label** → **New label…**, e.g. `Alex School`.
4. Tick **Also apply filter to matching conversations** → **Create filter**.

Write down the exact label name. Whenever a new sender appears (a new teacher, a class parent), add them to the filter.

### Step 2: Apps Script (attachment reader + tasks sync)

1. Go to https://script.google.com → **New project**. Name it, e.g., "School emails helper".
2. Create **three script files** and paste in the matching file from `apps-script/`. Click **+** next to Files → **Script** to add each one. Delete the sample `function myFunction() {}` first, so your code doesn't end up inside it.
   - `Config.gs`
   - `AttachmentText.gs`
   - `DueTasks.gs`
3. In `Config.gs`, set **`CHILD_NAME`** and **`GMAIL_LABEL`** (the exact label name from step 1). Then **Save** 💾.
4. Left sidebar → **Services (+)** → add **Drive API** → **Add**. Then **Services (+)** → **Google Tasks API** → **Add**.
5. Pick **`setup`** in the function dropdown → **▶ Run**.
6. Google will say **"Google hasn't verified this app"**. That's normal for your own personal script. Click **Advanced** → **Go to … (unsafe)** → review the permissions (Gmail, Calendar, Drive, Docs, Tasks) → **Allow**.
7. Check the **Execution log**. `setup()`:
   - creates the calendar **"<Child>'s School"** (visible), the hidden calendar **"<Child>'s School – To Do"** and the task list **"<Child>'s School"**,
   - reads attachments from the last 14 days,
   - installs two timers (attachments hourly, tasks every 15 minutes),
   - and prints a block like this. **Keep it; you need it in step 5:**
     ```
     {{GMAIL_LABEL}}          = …
     {{SCHOOL_CALENDAR_NAME}} = …
     {{SCHOOL_CALENDAR_ID}}   = …
     {{TODO_CALENDAR_NAME}}   = …
     {{TODO_CALENDAR_ID}}     = …
     {{PARENT_EMAIL}}         = …
     {{TIMEZONE}}             = …
     ```
8. Recommended: **Triggers** (⏰ icon) → ✏️ on each trigger → **Failure notification settings** → **Notify me immediately**. Google will then email you if a script run fails.

### Step 3: Share the calendar

Google Calendar → hover over **"<Child>'s School"** → ⋮ → **Settings and sharing** → **Share with specific people** → add your co-parent or caregiver.

**Alerts are per person.** Each person who wants alerts sets them in the same settings page, under **Event notifications** and **All-day event notifications**. The alerts the routine sets only notify the calendar owner.

### Step 4: Connect Claude to Google

Go to https://claude.ai/customize/connectors and connect **Gmail** and **Google Calendar**, using the same Google account.

### Step 5: Create the routine

**Option A (easiest, with Claude Code):**

```bash
git clone https://github.com/<you>/school-emails-to-calendar.git
cd school-emails-to-calendar
claude
```

Then type **`/setup-school-routine`**. It asks a few questions (child's name, grade, school, the block from step 2.7, alert and run times), fills in the template, creates the routine and runs a test.

**Option B (manually, on the web):**

1. Copy `ROUTINE_PROMPT.template.md` to `my-routine-prompt.md`. That name is git-ignored, so your details are never committed.
2. Replace every `{{PLACEHOLDER}}`:

   | Placeholder | Example | Notes |
   |---|---|---|
   | `{{CHILD_NAME}}` | `Alex` | |
   | `{{GRADE}}` | `Kindergarten` | |
   | `{{SCHOOL}}` | `Lincoln Elementary` | |
   | `{{DISTRICT_SUFFIX}}` | ` (Springfield School District)` | With a leading space, or empty |
   | `{{GMAIL_LABEL}}`, `{{SCHOOL_CALENDAR_NAME}}`, `{{SCHOOL_CALENDAR_ID}}`, `{{TODO_CALENDAR_NAME}}`, `{{TODO_CALENDAR_ID}}`, `{{PARENT_EMAIL}}`, `{{TIMEZONE}}` | | From the `setup()` log |
   | `{{EVENING_REMINDER_MINUTES}}` / `{{EVENING_REMINDER_LABEL}}` | `240` / `8:00pm` | Minutes before midnight: 7pm=300, 8pm=240, 9pm=180 |
   | `{{MORNING_REMINDER_MINUTES}}` / `{{MORNING_REMINDER_LABEL}}` | `-420` / `7:00am` | Negative minutes after midnight: 6:30am=-390, 7am=-420, 8am=-480 |
   | `{{RUN_TIMES}}` | `7:00, 12:00, 16:00 and 20:00` | Must match the schedule below |

   Search the file for `{{` to make sure none are left.
3. Go to https://claude.ai/code/routines → **New routine**:
   - **Prompt:** the full contents of `my-routine-prompt.md`
   - **Schedule:** e.g. 4 times a day. Cron is in **UTC**: for US Eastern daylight time, 7am, 12pm, 4pm and 8pm is `0 0,11,16,20 * * *`.
   - **Model:** Claude Opus. Smaller models tend to miss items in long newsletters.
   - **Connectors:** Gmail and Google Calendar
   - **Repository:** none
4. **Run it once** and read the run's log to check it.

---

## 4. Day to day

| Where | What you'll find |
|---|---|
| 📅 **"<Child>'s School" calendar** | Everything to know about or attend, with alerts the evening before and the morning of |
| ✔️ **Google Tasks → "<Child>'s School" list** | Things to do. Tick them off when done. In Gmail or Calendar, open the Tasks panel on the right and switch lists with the ▾ next to the list name |
| 📬 **`🎒 <Child>'s school: …` emails** | A summary after a run that added or changed something, or found something you should check. No news, no email |
| ⚠️ **`⚠️ <Child>'s school routine: error` emails** | Sent only if a step failed |

Pause the routine over **summer and school breaks** at https://claude.ai/code/routines. The Apps Script can stay on; with no new email, it does nothing.

---

## 5. What goes where

| Kind of item | Where | Format |
|---|---|---|
| Dress-up or theme day, bring something, picture day, no school, early dismissal | School calendar | All-day, alerts at 8pm the evening before and 7am that morning |
| Multi-day event (book fair, spirit week) | School calendar | One event spanning the days, or one per day if each day has its own theme |
| Something you attend at a set time (concert, conference, family night) | School calendar | Timed event, alert the evening before |
| Something to do: send money, return a form, RSVP, order, register | Google Tasks (via the hidden To Do calendar) | Task due that day |

**Descriptions** are at most three lines:
- what to do or bring, with short links,
- **📧 Open email**, a link to the original email. It works on a computer; the Gmail phone app doesn't open these links.
- **🔎 Gmail app search:** a few subject words to search for on your phone.

**Dates:**
- "This Friday" or "tomorrow" is worked out from the date the email was sent.
- "ASAP", or a request with no date, becomes due on the next school day.

**Changes:**
- If a later email says something moved or was cancelled, the existing item is moved (`(moved)`, ⚠️ note) or marked `CANCELLED`. It is never deleted.
- Two sources with different dates and no wording about a change are flagged under "Please check" instead of guessed.

**Done items:** ticking a task renames its hidden event `✅ DUE: …`, so it's never re-added.

---

## 6. Customizing

Everything the routine does is in your `my-routine-prompt.md`. Edit it, then paste it into the routine again, or run `/setup-school-routine` again. Common changes:

- **Alert times:** the reminder minutes in step 5 of the prompt.
- **What counts as relevant:** the Context section, e.g. after-school programs or a second child.
- **Run times:** the routine's schedule, plus `{{RUN_TIMES}}` in the prompt.
- **Two children at different schools:** set up a second label, a second Apps Script project with a different `CHILD_NAME`, and a second routine.

Apps Script settings live in `CONFIG` at the top of `Config.gs`: OCR language, minimum image size, look-back and cleanup windows.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| An email was ignored | Check it has your label. The filter may be missing that sender |
| Something from a flyer or newsletter image is missing | Apps Script → **Executions**: did `processAttachments` run without errors? Images under 20 KB are skipped |
| The dropdown only shows `myFunction` | You pasted inside the sample function. Clear the file (⌘A / Ctrl+A → delete) and paste again |
| `Tasks is not defined` or `Drive is not defined` | Add the **Google Tasks API** or **Drive API** service (Step 2.4) |
| Your task list looks empty | You're viewing your default list. Switch to "<Child>'s School" with the ▾ next to the list name |
| The co-parent gets no alerts | Alerts are per person (Step 3) |
| Duplicate events | Delete the extra one. If it keeps happening, describe the case in the prompt's Context section |
| Routine errors mention connectors | Reconnect Gmail or Calendar at https://claude.ai/customize/connectors |
| Gmail search finds nothing | The label must be in quotes: `label:"My Label"`. Searching by label ID doesn't work |

Run history:
- **Routine:** https://claude.ai/code/routines → your routine → each run has a full log.
- **Apps Script:** the **Executions** page.

---

## 8. Limitations

- **Links aren't followed.** Content only behind a link ("view full post", Google Docs, Smore) isn't read.
- **OCR isn't perfect.** Fancy fonts and busy flyers may come out garbled.
- **3-day look-back.** If the routine is paused or failing for longer than that, run it once over a wider window to catch up.
- **Judgment calls.** The routine is told to flag uncertainty rather than guess, but skim the summaries.
- **Tasks are personal.** Google Tasks can't be shared. The co-parent sees events, not to-dos.
- **No alerts on tasks** created by the script. Add a time to a task by hand if you want one.

---

## 9. Privacy

- Everything runs **in your own accounts**: your Google account (Apps Script, Calendar, Tasks) and your Claude plan (routine and connectors). Nothing is sent to the author of this repo or to any third-party service.
- The routine only **reads** labeled email. It **creates or updates** events only on its two calendars and **emails only you**. It never deletes events, never replies to or forwards email, and never touches your primary calendar.
- The Apps Script reads attachments under your label. It creates a temporary Google Doc for OCR and deletes it immediately. It emails the text to you, and trashes its own text copies after 4 days.
- **Don't commit `my-routine-prompt.md`.** It contains your child's name, school, email address and calendar IDs. It's in `.gitignore`.

---

## 10. Files

| File | Purpose |
|---|---|
| `ROUTINE_PROMPT.template.md` | The routine's instructions, with `{{PLACEHOLDERS}}` |
| `apps-script/Config.gs` | Settings, plus `setup()`, which creates the calendars and task list, installs timers and prints your values |
| `apps-script/AttachmentText.gs` | Attachment reader (OCR → text emails) |
| `apps-script/DueTasks.gs` | To-do ⇄ Google Tasks sync |
| `.claude/commands/setup-school-routine.md` | The guided `/setup-school-routine` command for Claude Code |
| `my-routine-prompt.md` | **Yours, not committed:** your filled-in prompt |

License: MIT. See `LICENSE`.
