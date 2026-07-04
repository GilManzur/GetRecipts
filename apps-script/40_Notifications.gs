function processNotificationQueue() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('This script must be deployed as a bound script from the target Google Sheet.');
  }

  const sheet = getOrCreateNotificationQueueSheet_(spreadsheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, NOTIFICATION_HEADERS.length).getValues();
  let hasChanges = false;

  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    const status = String(row[1] || '').trim().toLowerCase();
    const attempts = Number(row[2] || 0);

    if (status === 'sent' || attempts >= 5) {
      continue;
    }

    hasChanges = true;
    row[2] = attempts + 1;
    row[3] = new Date();

    try {
      const queueItem = mapNotificationRow_(row);
      sendReceiptNotificationEmails_(queueItem);
      row[1] = 'sent';
      row[4] = new Date();
      row[5] = '';
    } catch (error) {
      row[1] = 'failed';
      row[5] = String(error);
      console.error('Receipt notification failed', error);
    }
  }

  if (hasChanges) {
    sheet.getRange(2, 1, values.length, NOTIFICATION_HEADERS.length).setValues(values);
  }
}

function enqueueNotification_(spreadsheet, payload) {
  const queueSheet = getOrCreateNotificationQueueSheet_(spreadsheet);
  queueSheet.appendRow([
    payload.queuedAt || new Date(),
    'pending',
    0,
    '',
    '',
    '',
    payload.company || '',
    payload.submitterName || '',
    payload.role || '',
    Number(payload.amount || 0),
    payload.purchaseDate || '',
    payload.comments || '',
    payload.driveFileId || '',
    payload.driveFileUrl || '',
    payload.fileName || '',
    payload.localId || ''
  ]);
}

function getOrCreateNotificationQueueSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(NOTIFICATION_QUEUE_SHEET);
  if (sheet) {
    ensureNotificationHeaders_(sheet);
    return sheet;
  }

  sheet = spreadsheet.insertSheet(NOTIFICATION_QUEUE_SHEET);
  ensureNotificationHeaders_(sheet);
  sheet.hideSheet();
  return sheet;
}

function ensureNotificationHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, NOTIFICATION_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasMatchingHeaders = currentHeaders.every(function(value, index) {
    return value === NOTIFICATION_HEADERS[index];
  });

  if (!hasMatchingHeaders) {
    headerRange.setValues([NOTIFICATION_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function mapNotificationRow_(row) {
  return {
    queuedAt: row[0],
    status: row[1],
    attempts: row[2],
    lastAttemptAt: row[3],
    sentAt: row[4],
    errorMessage: row[5],
    company: row[6],
    submitterName: row[7],
    role: row[8],
    amount: row[9],
    purchaseDate: row[10],
    comments: row[11],
    driveFileId: row[12],
    driveFileUrl: row[13],
    fileName: row[14],
    localId: row[15]
  };
}

function sendReceiptNotificationEmails_(queueItem) {
  const recipients = NOTIFICATION_EMAILS
    .map(function(email) {
      return String(email || '').trim();
    })
    .filter(Boolean);
  if (!recipients.length) {
    return;
  }

  const driveFile = DriveApp.getFileById(queueItem.driveFileId);
  const receiptBlob = driveFile.getBlob().setName(queueItem.fileName || driveFile.getName());
  const attachmentBlob = receiptBlob.copyBlob().setName(queueItem.fileName || driveFile.getName());
  const inlineReceiptBlob = receiptBlob.copyBlob().setName(queueItem.fileName || driveFile.getName());
  const headerBlob = Utilities.newBlob(
    Utilities.base64Decode(EMAIL_HEADER_PNG_BASE64),
    'image/png',
    'receipts-header.png'
  );
  const subject = 'New receipt uploaded: ' + (queueItem.company || 'Receipt');

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    name: 'Receipts',
    htmlBody: buildReceiptEmailHtml_(queueItem),
    body: buildReceiptEmailText_(queueItem),
    inlineImages: {
      appHeader: headerBlob,
      receiptPreview: inlineReceiptBlob
    },
    attachments: [attachmentBlob]
  });
}
