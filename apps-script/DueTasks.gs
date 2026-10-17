/**
 * "🎒 DUE:" items → Google Tasks you can check off
 *
 * The routine can't create Google Tasks directly, so it writes to-do items
 * ("🎒 DUE: Send $5 for pizza lunch") as all-day events on the hidden To Do calendar.
 * Every 15 minutes this:
 *   - creates a matching task (same date) for each new DUE event
 *   - moves the task if the routine moves the event
 *   - removes the task if the routine cancels the event
 *   - when you check a task off, renames its event "✅ DUE: …" so the routine
 *     knows it's done and never re-adds it
 */

function syncDueTasks() {
  const cal = todoCalendar_();
  const listId = taskListId_();
  const props = PropertiesService.getScriptProperties();
  const map = JSON.parse(props.getProperty('TASK_MAP') || '{}'); // eventId -> { task, due }

  const now = new Date();
  const events = cal.getEvents(new Date(now.getTime() - 14 * 86400000), new Date(now.getTime() + 120 * 86400000));

  events.forEach(function (ev) {
    const id = ev.getId();
    const title = ev.getTitle();
    const due = ymd_(ev);
    const entry = map[id];

    if (!entry) {
      if (/^🎒 DUE:/.test(title)) {
        const task = Tasks.Tasks.insert({
          title: title.replace(/^🎒 DUE:\s*/, '🎒 '),
          notes: plainText_(ev.getDescription()),
          due: due + 'T00:00:00.000Z',
        }, listId);
        map[id] = { task: task.id, due: due };
        Logger.log('Created task for "%s" (%s)', title, due);
      }
      return;
    }

    let task;
    try {
      task = Tasks.Tasks.get(listId, entry.task);
    } catch (e) {
      delete map[id]; // task was deleted by hand; leave the event alone
      return;
    }

    if (/CANCELLED/.test(title)) {
      if (task.status !== 'completed') Tasks.Tasks.remove(listId, entry.task);
      delete map[id];
      Logger.log('Removed task for cancelled "%s"', title);
      return;
    }

    if (task.status === 'completed') {
      if (!/^✅/.test(title)) {
        ev.setTitle('✅ ' + title.replace(/^🎒\s*/, ''));
        Logger.log('Marked "%s" done', title);
      }
      return;
    }

    if (due !== entry.due) {
      Tasks.Tasks.patch({ due: due + 'T00:00:00.000Z' }, listId, entry.task);
      entry.due = due;
      Logger.log('Moved task for "%s" to %s', title, due);
    }
  });

  // Forget pairs whose date is long past.
  const cutoff = Utilities.formatDate(new Date(now.getTime() - 30 * 86400000), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  Object.keys(map).forEach(function (id) { if (map[id].due < cutoff) delete map[id]; });
  props.setProperty('TASK_MAP', JSON.stringify(map));
}

function taskListId_() {
  const name = cfg_('TASKLIST_NAME');
  const lists = Tasks.Tasklists.list().items || [];
  const found = lists.filter(function (l) { return l.title === name; })[0];
  return found ? found.id : Tasks.Tasklists.insert({ title: name }).id;
}

function ymd_(ev) {
  const d = ev.isAllDayEvent() ? ev.getAllDayStartDate() : ev.getStartTime();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// Calendar descriptions are HTML; Tasks notes are plain text.
function plainText_(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2: $1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}
