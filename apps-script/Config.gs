/**
 * School Emails → Calendar: settings and one-time setup
 *
 * This Apps Script project has three files:
 *   Config.gs          this file: your settings + setup()
 *   AttachmentText.gs  turns image/PDF attachments into text emails the routine can read
 *   DueTasks.gs        turns "🎒 DUE:" items into Google Tasks you can check off
 *
 * Setup:
 *   1. Edit CONFIG below.
 *   2. Services (+) → add "Drive API" and "Google Tasks API".
 *   3. Choose setup() in the function dropdown → Run → approve the permissions.
 *   4. Copy the values printed at the end of the log into your routine instructions.
 */

const CONFIG = {
  // Your child's first name. Used to name the calendars and the task list.
  CHILD_NAME: 'CHANGE_ME',

  // The exact name of the Gmail label your school filter applies.
  GMAIL_LABEL: 'CHANGE_ME',

  // Calendar and task list names. The defaults are fine; change them if you like.
  SCHOOL_CALENDAR_NAME: '',   // default: "<CHILD_NAME>'s School"   (shared, with alerts)
  TODO_CALENDAR_NAME: '',     // default: "<CHILD_NAME>'s School – To Do" (hidden bookkeeping)
  TASKLIST_NAME: '',          // default: "<CHILD_NAME>'s School"   (your checklist)

  // Attachment reader
  OCR_LANGUAGE: 'en',                    // language of school flyers/newsletters
  MIN_IMAGE_BYTES: 20 * 1024,            // skip images smaller than this (logos, icons)
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024,
  LOOKBACK: '3d',                        // how far back each hourly run looks
  FIRST_RUN_LOOKBACK: '14d',             // how far back setup() looks the first time
  TEXT_COPY_TRASH_AFTER: '4d',           // the routine reads 3 days back, so 4d is safe
};

function cfg_(key) {
  const name = CONFIG.CHILD_NAME;
  const defaults = {
    SCHOOL_CALENDAR_NAME: name + "'s School",
    TODO_CALENDAR_NAME: name + "'s School – To Do",
    TASKLIST_NAME: name + "'s School",
  };
  return CONFIG[key] || defaults[key];
}

function setup() {
  if (CONFIG.CHILD_NAME === 'CHANGE_ME' || CONFIG.GMAIL_LABEL === 'CHANGE_ME') {
    throw new Error('Edit CONFIG at the top of Config.gs first (CHILD_NAME and GMAIL_LABEL).');
  }
  if (!GmailApp.getUserLabelByName(CONFIG.GMAIL_LABEL)) {
    throw new Error('Gmail label not found: "' + CONFIG.GMAIL_LABEL + '". Check the exact spelling in Gmail.');
  }

  const school = schoolCalendar_();
  const todo = todoCalendar_();
  taskListId_();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['processAttachments', 'syncDueTasks'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processAttachments').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('syncDueTasks').timeBased().everyMinutes(15).create();

  readAttachments_(CONFIG.FIRST_RUN_LOOKBACK);
  syncDueTasks();

  Logger.log([
    '',
    'Setup complete. Attachments are read every hour; tasks sync every 15 minutes.',
    '',
    'Copy these into your routine instructions (ROUTINE_PROMPT.template.md):',
    '  {{GMAIL_LABEL}}          = ' + CONFIG.GMAIL_LABEL,
    '  {{SCHOOL_CALENDAR_NAME}} = ' + school.getName(),
    '  {{SCHOOL_CALENDAR_ID}}   = ' + school.getId(),
    '  {{TODO_CALENDAR_NAME}}   = ' + todo.getName(),
    '  {{TODO_CALENDAR_ID}}     = ' + todo.getId(),
    '  {{PARENT_EMAIL}}         = ' + Session.getEffectiveUser().getEmail(),
    '  {{TIMEZONE}}             = ' + Session.getScriptTimeZone(),
  ].join('\n'));
}

// Shared calendar for everything to know about or attend. Share it with your co-parent.
function schoolCalendar_() {
  return calendar_('SCHOOL_CAL_ID', cfg_('SCHOOL_CALENDAR_NAME'), true);
}

// Hidden calendar that holds DUE items. It only feeds the task list; you never look at it.
function todoCalendar_() {
  return calendar_('TODO_CAL_ID', cfg_('TODO_CALENDAR_NAME'), false);
}

function calendar_(propKey, name, selected) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(propKey);
  let cal = id ? CalendarApp.getCalendarById(id) : null;
  if (!cal) {
    cal = CalendarApp.getCalendarsByName(name)[0] ||
      CalendarApp.createCalendar(name, { timeZone: Session.getScriptTimeZone(), selected: selected });
    props.setProperty(propKey, cal.getId());
  }
  return cal;
}
