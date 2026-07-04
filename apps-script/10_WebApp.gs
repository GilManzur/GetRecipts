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
    const fileId = file.getId();

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

    enqueueNotification_(spreadsheet, {
      queuedAt: timestamp,
      company: data.company || '',
      submitterName: data.submitterName || '',
      role: data.role || '',
      amount: Number(data.amount || 0),
      purchaseDate: data.purchaseDate || '',
      comments: data.comments || '',
      driveFileId: fileId,
      driveFileUrl: fileUrl,
      fileName: file.getName(),
      localId: localId
    });

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
