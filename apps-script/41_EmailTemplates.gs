function buildReceiptEmailHtml_(queueItem) {
  const amountText = formatCurrency_(queueItem.amount);
  const purchaseDateText = formatPurchaseDate_(queueItem.purchaseDate);
  const queuedAtText = formatDateTime_(queueItem.queuedAt);
  const commentsText = queueItem.comments ? escapeHtml_(queueItem.comments) : '&mdash;';
  const driveUrl = escapeAttribute_(queueItem.driveFileUrl || '');
  const detailsGrid = [
    buildEmailCardHtml_('יחידה', queueItem.company || '&mdash;', true),
    buildEmailCardHtml_('שם מלא', queueItem.submitterName || '&mdash;', true),
    buildEmailCardHtml_('תפקיד', queueItem.role || '&mdash;', true),
    buildEmailCardHtml_('תאריך', purchaseDateText || '&mdash;', true),
    buildEmailCardHtml_('מחיר', amountText || '&mdash;', true),
    buildEmailCardHtml_('הועלה', queuedAtText || '&mdash;', true)
  ].join('');

  return ''
    + '<!DOCTYPE html>'
    + '<html lang="he" dir="rtl">'
    + '<head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<style>'
    + 'body{margin:0;padding:0;background-color:#eef1e7;font-family:Arial,Helvetica,sans-serif;color:#203024;direction:rtl;}'
    + 'table{border-collapse:collapse;}'
    + '.shell{background-color:#eef1e7;margin:0;padding:24px 12px;}'
    + '.card{max-width:640px;background-color:#ffffff;border-radius:20px;overflow:hidden;}'
    + '.section{padding:24px;}'
    + '.lead{font-size:24px;line-height:32px;font-weight:700;color:#203024;margin:0;}'
    + '.sub{margin-top:8px;font-size:14px;line-height:22px;color:#5c6b56;}'
    + '.grid{font-size:0;direction:rtl;text-align:right;}'
    + '.field-cell{display:inline-block;vertical-align:top;width:50%;padding:6px;box-sizing:border-box;}'
    + '.field-cell--full{width:100%;}'
    + '.field-box{background-color:#f7f8f4;border:1px solid #d7decd;border-radius:16px;padding:14px 16px;}'
    + '.field-label{font-size:12px;line-height:18px;font-weight:700;color:#55674b;margin-bottom:6px;}'
    + '.field-value{font-size:15px;line-height:22px;color:#203024;}'
    + '.button{display:inline-block;padding:14px 22px;border-radius:999px;background-color:#8ca073;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;line-height:14px;}'
    + '.meta{margin-top:14px;font-size:12px;line-height:18px;color:#708066;}'
    + '@media only screen and (max-width:600px){.field-cell{display:block !important;width:100% !important;}}'
    + '</style>'
    + '</head>'
    + '<body>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="shell" dir="rtl">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" dir="rtl">'
    + '<tr><td style="background-color:#44533a;padding:0;">'
    + '<img src="cid:appHeader" alt="Receipts" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">'
    + '</td></tr>'
    + '<tr><td class="section">'
    + '<div class="lead">קבלה חדשה הועלתה</div>'
    + '<div class="sub">התקבל דיווח חדש באפליקציית Receipts. פרטי הרכישה מופיעים כאן והקבלה מצורפת גם כקובץ.</div>'
    + '</td></tr>'
    + '<tr><td style="padding:0 18px;">'
    + '<div class="grid">'
    + detailsGrid
    + buildEmailCardHtml_('הערות', commentsText, true, true)
    + '</div>'
    + '</td></tr>'
    + '<tr><td class="section" style="padding-top:20px;">'
    + '<div class="field-label" style="font-size:16px;line-height:24px;color:#203024;margin-bottom:12px;">תמונת הקבלה</div>'
    + '<div style="background-color:#f7f8f4;border:1px solid #d7decd;border-radius:16px;padding:12px;text-align:center;">'
    + '<img src="cid:receiptPreview" alt="תמונת קבלה" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;border:0;">'
    + '</div>'
    + '</td></tr>'
    + '<tr><td class="section" style="padding-top:0;">'
    + '<a href="' + driveUrl + '" class="button">פתיחת הקבלה ב-Drive</a>'
    + '<div class="meta">האימייל נשלח ברקע לאחר שההעלאה נשמרה בהצלחה.</div>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</body>'
    + '</html>';
}

function buildEmailCardHtml_(label, value, preserveHtml, isFullWidth) {
  const safeValue = preserveHtml ? value : escapeHtml_(value || '');
  return ''
    + '<div class="field-cell' + (isFullWidth ? ' field-cell--full' : '') + '">'
    + '<div class="field-box">'
    + '<div class="field-label">' + escapeHtml_(label) + '</div>'
    + '<div class="field-value">' + safeValue + '</div>'
    + '</div>'
    + '</div>';
}

function buildReceiptEmailText_(queueItem) {
  return [
    'קבלה חדשה הועלתה',
    '',
    'יחידה: ' + (queueItem.company || ''),
    'שם מלא: ' + (queueItem.submitterName || ''),
    'תפקיד: ' + (queueItem.role || ''),
    'תאריך: ' + formatPurchaseDate_(queueItem.purchaseDate),
    'מחיר: ' + formatCurrency_(queueItem.amount),
    'הערות: ' + (queueItem.comments || ''),
    'קישור ל-Drive: ' + (queueItem.driveFileUrl || ''),
    'הועלה: ' + formatDateTime_(queueItem.queuedAt)
  ].join('\n');
}
