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
