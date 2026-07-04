function sanitizePart_(value) {
  return String(value || '')
    .trim()
    .replace(/[^\w\u0590-\u05FF-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatPurchaseDate_(value) {
  if (!value) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }

  const normalized = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parts = normalized.split('-');
    return [parts[2], parts[1], parts[0]].join('.');
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }

  return normalized;
}

function formatDateTime_(value) {
  const parsed = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
  if (isNaN(parsed.getTime())) {
    return '';
  }

  return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
}

function formatCurrency_(value) {
  const amount = Number(value || 0);
  return '\u20aa' + amount.toFixed(2);
}

function isSystemSheet_(sheetName) {
  return String(sheetName || '').indexOf('__') === 0;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute_(value) {
  return escapeHtml_(value).replace(/`/g, '&#96;');
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
