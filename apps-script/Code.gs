const DRIVE_FOLDER_ID = '1sbY3E5t70_TO4CHe1Kp782iM2nEDa-I0';
const DEFAULT_HEADERS = [
  'timestamp',
  'company',
  'submitterName',
  'role',
  'amount',
  'purchaseDate',
  'comments',
  'fileName',
  'driveFileUrl',
  'syncStatus',
  'localId'
];

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  if (action === 'dashboard') {
    return buildJsonpResponse_(getDashboardData_(e.parameter.unit || ''), e.parameter.callback);
  }

  return HtmlService.createHtmlOutput('Receipt backend is running.');
}

function doPost(e) {
  let localId = '';

  try {
    if (!e || !e.parameter || !e.parameter.payload) {
      return buildBridgeResponse({
        status: 'error',
        message: 'Missing payload'
      });
    }

    const data = JSON.parse(e.parameter.payload);
    localId = data.localId || data.id || '';

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('This script must be deployed as a bound script from the target Google Sheet.');
    }

    const unitSheetName = buildSheetName_(data.company);
    const sheet = getOrCreateUnitSheet_(spreadsheet, unitSheetName);

    const fileBlob = createBlobFromDataUrl_(data.fileData, data.fileName);
    const timestamp = new Date();
    const safeFileName = buildFileName_(data, timestamp);
    fileBlob.setName(safeFileName);

    const file = folder.createFile(fileBlob);
    const fileUrl = file.getUrl();

    sheet.appendRow([
      timestamp,
      data.company || '',
      data.submitterName || '',
      data.role || '',
      Number(data.amount || 0),
      data.purchaseDate || '',
      data.comments || '',
      data.fileName || safeFileName,
      fileUrl,
      'synced',
      localId
    ]);

    return buildBridgeResponse({
      status: 'success',
      localId: localId,
      fileUrl: fileUrl,
      syncedAt: timestamp.toISOString()
    });
  } catch (error) {
    return buildBridgeResponse({
      status: 'error',
      localId: localId,
      message: String(error)
    });
  }
}

function createBlobFromDataUrl_(dataUrl, fileName) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL');
  }

  const contentType = matches[1];
  const bytes = Utilities.base64Decode(matches[2]);
  return Utilities.newBlob(bytes, contentType, fileName || 'receipt-upload');
}

function buildFileName_(data, timestamp) {
  const parts = [
    sanitizePart_(data.company),
    sanitizePart_(data.submitterName),
    sanitizePart_(data.purchaseDate),
    timestamp.getTime()
  ].filter(Boolean);

  const extension = detectExtension_(data.fileData, data.fileName);
  return parts.join('_') + extension;
}

function detectExtension_(dataUrl, fileName) {
  if (fileName && fileName.indexOf('.') > -1) {
    return '.' + fileName.split('.').pop().toLowerCase();
  }

  if (!dataUrl) {
    return '.jpg';
  }

  if (dataUrl.indexOf('image/png') !== -1) return '.png';
  if (dataUrl.indexOf('image/gif') !== -1) return '.gif';
  return '.jpg';
}

function sanitizePart_(value) {
  return String(value || '')
    .trim()
    .replace(/[^\w\u0590-\u05FF-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSheetName_(company) {
  const cleaned = String(company || '').trim();
  if (!cleaned) {
    return 'ללא יחידה';
  }

  return cleaned.substring(0, 99);
}

function getOrCreateUnitSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) {
    ensureHeaders_(sheet);
    return sheet;
  }

  sheet = spreadsheet.insertSheet(sheetName);
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length).setValues([DEFAULT_HEADERS]);
  sheet.setFrozenRows(1);
}

function buildBridgeResponse(payload) {
  const safePayload = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  const html = ''
    + '<!DOCTYPE html><html><body>'
    + '<script>'
    + 'window.top.postMessage("receipt-sync:" + ' + JSON.stringify(safePayload) + ', "*");'
    + '</script>'
    + '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDashboardData_(selectedUnit) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('This script must be deployed as a bound script from the target Google Sheet.');
  }

  const requestedUnit = String(selectedUnit || '').trim();
  const sheets = spreadsheet.getSheets();
  const unitSummaries = [];
  const recentReports = [];

  for (let i = 0; i < sheets.length; i += 1) {
    const sheet = sheets[i];
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 11) {
      continue;
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    let totalAmount = 0;

    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      const row = values[rowIndex];
      const amount = Number(row[4] || 0);
      totalAmount += amount;

      if (requestedUnit && sheet.getName() === requestedUnit) {
        recentReports.push({
          timestamp: toIsoString_(row[0]),
          company: row[1] || sheet.getName(),
          submitterName: row[2] || '',
          role: row[3] || '',
          amount: amount,
          purchaseDate: row[5] || '',
          comments: row[6] || '',
          fileName: row[7] || '',
          driveFileUrl: row[8] || '',
          syncStatus: row[9] || 'synced',
          localId: row[10] || ''
        });
      }
    }

    unitSummaries.push({
      unitName: sheet.getName(),
      reportsCount: values.length,
      totalAmount: totalAmount
    });
  }

  unitSummaries.sort(function(a, b) {
    return b.totalAmount - a.totalAmount;
  });

  recentReports.sort(function(a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    generatedAt: new Date().toISOString(),
    units: unitSummaries,
    recentReports: recentReports
  };
}

function buildJsonpResponse_(payload, callbackName) {
  const safeCallback = /^[A-Za-z0-9_.]+$/.test(callbackName || '') ? callbackName : 'receiptDashboardCallback';
  const output = safeCallback + '(' + JSON.stringify(payload) + ');';
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function toIsoString_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return '';
}
