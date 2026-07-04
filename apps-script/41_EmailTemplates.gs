function buildReceiptEmailHtml_(queueItem) {
  const amountText = formatCurrency_(queueItem.amount);
  const purchaseDateText = formatPurchaseDate_(queueItem.purchaseDate);
  const queuedAtText = formatDateTime_(queueItem.queuedAt);
  const commentsText = queueItem.comments ? escapeHtml_(queueItem.comments) : '&mdash;';
  const driveUrl = escapeAttribute_(queueItem.driveFileUrl || '');

  return ''
    + '<!DOCTYPE html>'
    + '<html lang="en">'
    + '<body style="margin:0;padding:0;background-color:#eef1e7;font-family:Arial,Helvetica,sans-serif;color:#203024;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1e7;margin:0;padding:24px 12px;">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:20px;overflow:hidden;">'
    + '<tr><td style="background-color:#44533a;padding:0;">'
    + '<img src="cid:appHeader" alt="Receipts" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">'
    + '</td></tr>'
    + '<tr><td style="padding:24px 24px 8px 24px;">'
    + '<div style="font-size:24px;line-height:32px;font-weight:700;color:#203024;">New receipt uploaded</div>'
    + '<div style="margin-top:8px;font-size:14px;line-height:22px;color:#5c6b56;">A new receipt was submitted through the Receipts app.</div>'
    + '</td></tr>'
    + '<tr><td style="padding:8px 24px 0 24px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">'
    + buildEmailRowHtml_('Unit', queueItem.company)
    + buildEmailRowHtml_('Full Name', queueItem.submitterName)
    + buildEmailRowHtml_('Role', queueItem.role)
    + buildEmailRowHtml_('Date', purchaseDateText)
    + buildEmailRowHtml_('Price', amountText)
    + buildEmailRowHtml_('הערות', commentsText, true)
    + '</table>'
    + '</td></tr>'
    + '<tr><td style="padding:20px 24px 0 24px;">'
    + '<div style="font-size:16px;font-weight:700;color:#203024;margin-bottom:12px;">Receipt image</div>'
    + '<div style="background-color:#f7f8f4;border:1px solid #d7decd;border-radius:16px;padding:12px;text-align:center;">'
    + '<img src="cid:receiptPreview" alt="Receipt image" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;border:0;">'
    + '</div>'
    + '</td></tr>'
    + '<tr><td style="padding:20px 24px 28px 24px;">'
    + '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background-color:#8ca073;">'
    + '<a href="' + driveUrl + '" style="display:inline-block;padding:14px 22px;font-size:14px;line-height:14px;color:#ffffff;text-decoration:none;font-weight:700;">Open receipt in Drive</a>'
    + '</td></tr></table>'
    + '<div style="margin-top:14px;font-size:12px;line-height:18px;color:#708066;">Uploaded at ' + escapeHtml_(queuedAtText) + '</div>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</body>'
    + '</html>';
}

function buildEmailRowHtml_(label, value, preserveHtml) {
  const safeValue = preserveHtml ? value : escapeHtml_(value || '');
  return ''
    + '<tr>'
    + '<td style="width:150px;padding:14px 16px;background-color:#f7f8f4;border:1px solid #d7decd;border-radius:14px 0 0 14px;font-size:13px;font-weight:700;color:#44533a;">' + escapeHtml_(label) + '</td>'
    + '<td style="padding:14px 16px;background-color:#f7f8f4;border:1px solid #d7decd;border-right:none;border-radius:0 14px 14px 0;font-size:14px;line-height:20px;color:#203024;">' + safeValue + '</td>'
    + '</tr>';
}

function buildReceiptEmailText_(queueItem) {
  return [
    'New receipt uploaded',
    '',
    'Unit: ' + (queueItem.company || ''),
    'Full Name: ' + (queueItem.submitterName || ''),
    'Role: ' + (queueItem.role || ''),
    'Date: ' + formatPurchaseDate_(queueItem.purchaseDate),
    'Price: ' + formatCurrency_(queueItem.amount),
    'הערות: ' + (queueItem.comments || ''),
    'Drive link: ' + (queueItem.driveFileUrl || ''),
    'Uploaded at: ' + formatDateTime_(queueItem.queuedAt)
  ].join('\n');
}
