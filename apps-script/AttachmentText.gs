/**
 * Attachments → text emails
 *
 * The Claude routine reads email text but can't open attachments, and schools often
 * send newsletters and flyers as images or PDFs. Every hour this:
 *   1. finds image/PDF attachments under your school label
 *   2. turns them into text with Google Drive's built-in OCR (a temporary Google Doc,
 *      deleted right away)
 *   3. emails the text to you as "[Attachment text] …", labeled, read and archived,
 *      so the routine picks it up without cluttering your inbox
 *   4. trashes those text copies once the routine no longer needs them
 * Your original emails are never changed.
 */

const SUBJECT_PREFIX = '[Attachment text] '; // plain ASCII: emoji get garbled in Apps Script subjects

function processAttachments() {
  readAttachments_(CONFIG.LOOKBACK);
  trashOldTextCopies_();
}

function readAttachments_(lookback) {
  const label = GmailApp.getUserLabelByName(CONFIG.GMAIL_LABEL);
  if (!label) throw new Error('Gmail label not found: ' + CONFIG.GMAIL_LABEL);

  const props = PropertiesService.getScriptProperties();
  const done = JSON.parse(props.getProperty('DONE') || '{}');
  const me = Session.getEffectiveUser().getEmail();
  const query = 'label:"' + CONFIG.GMAIL_LABEL + '" has:attachment newer_than:' + lookback + ' -subject:"Attachment text"';

  GmailApp.search(query, 0, 50).forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      if (msg.getFrom().indexOf(me) !== -1) return; // skip your own replies and forms you sent

      msg.getAttachments({ includeInlineImages: true }).forEach(function (att, i) {
        const key = msg.getId() + ':' + i;
        if (done[key] || !isReadable_(att)) return;
        done[key] = Date.now();

        // Replies often re-attach the same flyer; only send each file's text once.
        const hash = 'h:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, att.getBytes()));
        if (done[hash]) return;
        done[hash] = Date.now();

        const text = ocr_(att);
        if (text && text.trim().length >= 20) {
          sendText_(label, me, msg, thread, att.getName(), text);
          Logger.log('Sent text for "%s" (%s)', att.getName(), msg.getSubject());
        }
      });
    });
  });

  // Forget entries older than 30 days so the property stays small.
  const cutoff = Date.now() - 30 * 86400000;
  Object.keys(done).forEach(function (k) { if (done[k] < cutoff) delete done[k]; });
  props.setProperty('DONE', JSON.stringify(done));
}

function trashOldTextCopies_() {
  const me = Session.getEffectiveUser().getEmail();
  GmailApp.search('label:"' + CONFIG.GMAIL_LABEL + '" subject:"Attachment text" from:' + me +
      ' older_than:' + CONFIG.TEXT_COPY_TRASH_AFTER, 0, 100)
    .forEach(function (t) { t.moveToTrash(); });
}

function isReadable_(att) {
  const type = att.getContentType();
  const size = att.getSize();
  if (size > CONFIG.MAX_ATTACHMENT_BYTES) return false;
  if (type === 'application/pdf') return true;
  if (/^image\/(jpeg|png|gif|bmp|webp)$/.test(type)) return size >= CONFIG.MIN_IMAGE_BYTES;
  return false;
}

// Uploads the file as a Google Doc (which runs OCR), reads the text, deletes the doc.
function ocr_(att) {
  const file = Drive.Files.create(
    { name: 'tmp-ocr-' + att.getName(), mimeType: 'application/vnd.google-apps.document' },
    att.copyBlob(),
    { ocrLanguage: CONFIG.OCR_LANGUAGE }
  );
  try {
    return DocumentApp.openById(file.id).getBody().getText();
  } finally {
    Drive.Files.remove(file.id);
  }
}

function sendText_(label, me, msg, thread, name, text) {
  const tz = Session.getScriptTimeZone();
  const body = [
    'Original subject: ' + msg.getSubject(),
    'Original sender: ' + msg.getFrom(),
    'Original date: ' + Utilities.formatDate(msg.getDate(), tz, 'yyyy-MM-dd HH:mm'),
    'Original thread: ' + thread.getId(),
    'Attachment: ' + name,
    '',
    '--- Text read from the attachment (OCR, may contain errors) ---',
    text,
  ].join('\n');

  const sent = GmailApp.createDraft(me, SUBJECT_PREFIX + name + ' (' + msg.getSubject() + ')', body).send();
  const t = sent.getThread();
  t.addLabel(label);
  t.markRead();
  t.moveToArchive(); // out of your inbox; still under the school label for the routine
}
