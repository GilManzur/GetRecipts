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
    if (isSystemSheet_(sheet.getName())) {
      continue;
    }

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
