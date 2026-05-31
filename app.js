const STORAGE_KEY = "receipt_app_entries_v1";
const SCRIPT_URL_KEY = "receipt_script_url_v1";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFNgvfbYq2GFCm2HjR-iJ7gdfIMCSbU03Sd6PQA4kwmc6Exo_aVHtpFmnpoDc79h8r/exec";
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_ENTRIES = 20;
const LAST_NAME_KEY = "receipt_last_name_v1";
const LAST_UNIT_KEY = "receipt_last_unit_v1";
const LAST_ROLE_KEY = "receipt_last_role_v1";
const UNIT_BUDGETS = {
  "חרמ''ש": 7400,
  "פלס''ם": 7400,
  "פלוגה כ'": 3700,
  "פלוגה ל'": 3700,
  "פלוגה מ'": 3700,
  "פת''ן": 950,
  "פלוגת מבצעים": 950
};

let selectedFile = null;
let selectedBase64 = "";
let submittingEntryId = null;
let entries = loadEntries();
let syncQueue = [];
let syncInFlight = false;
let deferredInstallPrompt = null;
let dashboardState = {
  units: [],
  recentReports: [],
  loaded: false,
  error: ""
};

const form = document.getElementById("receiptForm");
const fileInput = document.getElementById("fileInput");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const previewName = document.getElementById("previewName");
const previewSize = document.getElementById("previewSize");
const uploadPrompt = document.getElementById("uploadPrompt");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");
const companySelect = document.getElementById("company");
const historyList = document.getElementById("historyList");
const unitSummaryList = document.getElementById("unitSummaryList");
const dashboardMeta = document.getElementById("dashboardMeta");
const syncPill = document.getElementById("syncPill");
const dropzone = document.getElementById("dropzone");
const syncBridgeForm = document.getElementById("syncBridgeForm");
const payloadInput = document.getElementById("payloadInput");
const loadingOverlay = document.getElementById("loadingOverlay");
const installAppBtn = document.getElementById("installAppBtn");
const installHelpOverlay = document.getElementById("installHelpOverlay");
const installHelpText = document.getElementById("installHelpText");

document.getElementById("removeFileBtn").addEventListener("click", clearSelectedFile);
document.getElementById("resetBtn").addEventListener("click", resetForm);
document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboardData);
document.getElementById("closeInstallHelpBtn").addEventListener("click", () => {
  installHelpOverlay.classList.add("hidden");
});
installAppBtn.addEventListener("click", handleInstallClick);

fileInput.addEventListener("change", handleFileSelect);
form.addEventListener("submit", handleSubmit);
window.addEventListener("message", handleMessageFromScript);
window.addEventListener("DOMContentLoaded", bootstrap);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
});

function bootstrap() {
  if (APPS_SCRIPT_URL) {
    localStorage.setItem(SCRIPT_URL_KEY, APPS_SCRIPT_URL);
  }
  registerServiceWorker();
  setDefaultPurchaseDate();
  restoreSavedDefaults();
  setupValidation();
  updateConnectionUI();
  renderUnitSummaries();
  renderHistory();
  updateUnitOptions();
  loadDashboardData();
}

function loadEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateConnectionUI() {
  const hasConnection = Boolean(getScriptUrl());
  syncPill.textContent = hasConnection ? "סנכרון פעיל" : "מצב מקומי";
}

function setupValidation() {
  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  requiredFields.forEach((field) => {
    const wrapper = field.closest(".field");
    if (wrapper && !wrapper.querySelector(".field__error")) {
      const error = document.createElement("div");
      error.className = "field__error";
      error.textContent = "יש למלא שדה זה";
      wrapper.appendChild(error);
    }

    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, () => validateField(field));
    field.addEventListener("blur", () => validateField(field));
  });
}

function validateField(field) {
  const isFileField = field === fileInput;
  const isValid = isFileField ? Boolean(selectedFile && selectedBase64) : field.checkValidity();
  const wrapper = field.closest(".field");

  if (wrapper) {
    wrapper.classList.toggle("has-error", !isValid);
  }
  field.classList.toggle("is-invalid", !isValid);

  if (isFileField) {
    dropzone.classList.toggle("is-invalid", !isValid);
  }

  return isValid;
}

function validateForm() {
  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    const isValid = validateField(field);
    if (!isValid && !firstInvalid) {
      firstInvalid = field;
    }
  });

  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }

  return true;
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showStatus("יש לבחור קובץ תמונה בלבד.", "error");
    clearSelectedFile();
    return;
  }

  try {
    const processed = await prepareImage(file);
    selectedFile = processed.file;
    selectedBase64 = processed.base64;
    previewImage.src = processed.base64;
    previewName.textContent = processed.file.name;
    previewSize.textContent = formatBytes(processed.file.size);
    previewWrap.classList.remove("hidden");
    uploadPrompt.classList.add("hidden");
    validateField(fileInput);
  } catch (error) {
    console.error(error);
    showStatus("לא ניתן לעבד את התמונה. נסה קובץ אחר.", "error");
    clearSelectedFile();
  }
}

async function prepareImage(file) {
  if (file.size <= MAX_FILE_SIZE_BYTES) {
    return {
      file,
      base64: await fileToDataUrl(file)
    };
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  const compressedFile = new File([blob], renameFileAsJpg(file.name), { type: "image/jpeg" });

  return {
    file: compressedFile,
    base64: await fileToDataUrl(compressedFile)
  };
}

function renameFileAsJpg(name) {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base}.jpg`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clearSelectedFile() {
  selectedFile = null;
  selectedBase64 = "";
  fileInput.value = "";
  previewWrap.classList.add("hidden");
  uploadPrompt.classList.remove("hidden");
  previewImage.removeAttribute("src");
  validateField(fileInput);
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!validateForm()) {
    showStatus("יש להשלים את כל שדות החובה המסומנים באדום.", "error");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    company: document.getElementById("company").value,
    submitterName: document.getElementById("submitterName").value.trim(),
    role: document.getElementById("role").value.trim(),
    amount: document.getElementById("amount").value,
    purchaseDate: document.getElementById("purchaseDate").value,
    comments: document.getElementById("comments").value.trim(),
    fileName: selectedFile.name,
    fileData: selectedBase64,
    createdAt: new Date().toISOString()
  };

  saveSubmissionDefaults(payload);

  const hasScript = Boolean(getScriptUrl());
  const entry = {
    ...payload,
    localId: payload.id,
    syncStatus: hasScript ? "pending" : "local-only",
    syncLabel: hasScript ? "ממתין לסנכרון" : "נשמר מקומית",
    syncError: "",
    driveUrl: "",
    syncedAt: "",
    submittedAtLabel: formatDateTime(payload.createdAt)
  };

  entries.unshift(entry);
  if (entries.length > MAX_LOCAL_ENTRIES) {
    entries = entries.slice(0, MAX_LOCAL_ENTRIES);
  }
  persistEntries();
  resetForm();
  renderHistory();

  if (hasScript) {
    showStatus("הדיווח נשמר מקומית ונשלח כעת לסנכרון.", "info");
    enqueueSync(entry.localId);
  } else {
    showStatus("הדיווח נשמר מקומית במכשיר. לא הוגדרה כתובת Apps Script.", "success");
  }
}

function resetForm() {
  form.reset();
  setDefaultPurchaseDate();
  clearSelectedFile();
  form.querySelectorAll(".has-error").forEach((element) => element.classList.remove("has-error"));
  form.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
  dropzone.classList.remove("is-invalid");
}

function showStatus(message, type) {
  statusBox.className = `status status--${type}`;
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
}

function renderUnitSummaries() {
  if (dashboardState.error) {
    dashboardMeta.textContent = dashboardState.error;
  } else if (dashboardState.loaded) {
    dashboardMeta.textContent = `מעודכן ל-${formatDateTime(dashboardState.generatedAt || new Date().toISOString())}`;
  } else {
    dashboardMeta.textContent = "טוען נתונים מהגיליון...";
  }

  if (!dashboardState.units.length) {
    unitSummaryList.innerHTML = '<div class="empty-state">עדיין אין נתוני יחידות בגיליון.</div>';
    return;
  }

  unitSummaryList.innerHTML = dashboardState.units.map((unit) => `
    <article class="unit-card">
      <div class="unit-card__top">
        <div class="unit-card__name">${escapeHtml(unit.unitName)}</div>
        <div class="unit-card__amount">${formatCurrency(unit.totalAmount)}</div>
      </div>
      <div class="unit-card__meta">${Number(unit.reportsCount || 0)} דיווחים${typeof unit.remainingBudget === "number" ? ` • נותר ${formatCurrency(unit.remainingBudget)}` : ""}</div>
    </article>
  `).join("");
}

function renderHistory() {
  const source = dashboardState.recentReports;

  if (!source.length) {
    historyList.innerHTML = '<div class="empty-state">עדיין אין דיווחים מהגיליון להצגה.</div>';
    return;
  }

  historyList.innerHTML = source.map((entry) => {
    const status = entry.syncStatus || "synced";
    const tagClass = status === "synced"
      ? "history-tag--synced"
      : status === "error"
        ? "history-tag--error"
        : "history-tag--local";

    const tagLabel = status === "synced"
      ? "מסונכרן"
      : status === "error"
        ? "שגיאה"
        : "מקומי";

    const driveButton = entry.driveFileUrl || entry.driveUrl
      ? `<a class="tiny-btn" href="${entry.driveFileUrl || entry.driveUrl}" target="_blank" rel="noreferrer">פתח קובץ</a>`
      : "";
    const imageUrl = getPreviewImageUrl(entry);
    const imageHtml = imageUrl
      ? `<img class="history-thumb" src="${imageUrl}" alt="צילום קבלה">`
      : "";
    const purchaseDateLabel = formatPurchaseDate(entry.purchaseDate);
    const timestampLabel = entry.timestamp ? formatDateTime(entry.timestamp) : entry.submittedAtLabel || "";

    return `
      <article class="history-item">
        <div class="history-item__top">
          <div>
            <strong>${escapeHtml(entry.company)}</strong>
            <div class="history-item__meta">${escapeHtml(entry.submitterName || "")} • ${escapeHtml(entry.role || "")}</div>
          </div>
          <span class="history-tag ${tagClass}">${tagLabel}</span>
        </div>
        <div class="history-item__bottom ${imageHtml ? "history-item__bottom--with-image" : ""}">
          <div class="history-item__meta">
            ${formatCurrency(entry.amount)} • ${escapeHtml(purchaseDateLabel)}<br>
            ${escapeHtml(timestampLabel)}
          </div>
          ${imageHtml}
        </div>
        <div class="history-actions">
          ${driveButton}
        </div>
      </article>
    `;
  }).join("");
}

function loadDashboardData() {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    dashboardState = buildLocalDashboardState_("לא הוגדרה כתובת Apps Script. מוצגים נתונים מקומיים.");
    renderUnitSummaries();
    renderHistory();
    return;
  }

  dashboardMeta.textContent = "טוען נתונים מהגיליון...";
  const callbackName = `receiptDashboardCallback_${Date.now()}`;
  const separator = scriptUrl.includes("?") ? "&" : "?";
  const script = document.createElement("script");
  const requestUrl = `${scriptUrl}${separator}action=dashboard&callback=${callbackName}&_ts=${Date.now()}`;
  script.src = requestUrl;
  script.async = true;
  script.crossOrigin = "anonymous";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    delete window[callbackName];
    script.remove();
  };

  const timeout = window.setTimeout(() => {
    cleanup();
    dashboardState = buildLocalDashboardState_("לא ניתן לטעון נתונים מהגיליון. מוצגים נתונים מקומיים. אם ההעלאה עובדת והרענון נכשל, יש לפרוס מחדש את Apps Script.");
    renderUnitSummaries();
    renderHistory();
  }, 10000);

  window[callbackName] = (payload) => {
    window.clearTimeout(timeout);
    cleanup();
    dashboardState = {
      generatedAt: payload.generatedAt,
      units: Array.isArray(payload.units) ? payload.units : [],
      recentReports: Array.isArray(payload.recentReports) ? payload.recentReports : [],
      loaded: true,
      error: ""
    };
    updateUnitOptions();
    renderUnitSummaries();
    renderHistory();
  };

  script.onerror = () => {
    window.clearTimeout(timeout);
    cleanup();
    loadDashboardDataFallback(callbackName);
  };

  document.body.appendChild(script);
}

function loadDashboardDataFallback(callbackName) {
  const scriptUrl = getScriptUrl();
  const separator = scriptUrl.includes("?") ? "&" : "?";
  const fallbackScript = document.createElement("script");
  fallbackScript.src = `${scriptUrl}${separator}action=dashboard&callback=${callbackName}&mobile=1&_ts=${Date.now()}`;
  fallbackScript.async = true;

  const timeout = window.setTimeout(() => {
    cleanupDashboardCallback(callbackName, fallbackScript);
    dashboardState = buildLocalDashboardState_("טעינת נתוני הגיליון נכשלה. מוצגים נתונים מקומיים. בטלפון נסה לפתוח את האתר בדפדפן הרגיל ולא רק מהמסך הראשי.");
    renderUnitSummaries();
    renderHistory();
  }, 10000);

  const originalCallback = window[callbackName];
  window[callbackName] = (payload) => {
    window.clearTimeout(timeout);
    cleanupDashboardCallback(callbackName, fallbackScript);
    if (typeof originalCallback === "function") {
      originalCallback(payload);
    } else {
      dashboardState = {
        generatedAt: payload.generatedAt,
        units: Array.isArray(payload.units) ? payload.units : [],
        recentReports: Array.isArray(payload.recentReports) ? payload.recentReports : [],
        loaded: true,
        error: ""
      };
      updateUnitOptions();
      renderUnitSummaries();
      renderHistory();
    }
  };

  fallbackScript.onerror = () => {
    window.clearTimeout(timeout);
    cleanupDashboardCallback(callbackName, fallbackScript);
    dashboardState = buildLocalDashboardState_("טעינת נתוני הגיליון נכשלה. מוצגים נתונים מקומיים. בטלפון נסה לפתוח את האתר בדפדפן הרגיל ולא רק מהמסך הראשי.");
    renderUnitSummaries();
    renderHistory();
  };

  document.body.appendChild(fallbackScript);
}

function cleanupDashboardCallback(callbackName, scriptElement) {
  if (scriptElement && scriptElement.parentNode) {
    scriptElement.parentNode.removeChild(scriptElement);
  }
  delete window[callbackName];
}

function enqueueSync(localId) {
  if (!syncQueue.includes(localId)) {
    syncQueue.push(localId);
  }
  if (!syncInFlight) {
    processNextSync();
  }
}

function processNextSync() {
  if (syncInFlight) {
    return;
  }

  const nextLocalId = syncQueue.shift();
  if (!nextLocalId) {
    return;
  }

  syncEntry(nextLocalId);
}

function syncEntry(localId) {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    showStatus("לא הוגדרה כתובת Apps Script.", "error");
    syncQueue = [];
    return;
  }

  const entry = entries.find((item) => item.localId === localId);
  if (!entry) {
    return;
  }

  syncInFlight = true;
  setLoadingOverlay(true);
  submittingEntryId = localId;
  entry.syncStatus = "pending";
  entry.syncLabel = "נשלח לסנכרון";
  entry.syncError = "";
  persistEntries();

  submitBtn.disabled = true;
  submitBtn.textContent = "שולח...";

  syncBridgeForm.action = scriptUrl;
  payloadInput.value = JSON.stringify(entry);
  syncBridgeForm.submit();
}

function handleMessageFromScript(event) {
  if (typeof event.data !== "string" || !event.data.startsWith("receipt-sync:")) {
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(event.data.replace("receipt-sync:", ""));
  } catch {
    return;
  }

  const entry = entries.find((item) => item.localId === parsed.localId || item.localId === submittingEntryId);
  if (!entry) {
    finalizeSubmissionUI();
    return;
  }

  if (parsed.status === "success") {
    entry.syncStatus = "synced";
    entry.syncLabel = "סונכרן בהצלחה";
    entry.driveUrl = parsed.fileUrl || "";
    entry.syncedAt = parsed.syncedAt || new Date().toISOString();
    entry.syncError = "";
    showStatus("הקבלה נשמרה בהצלחה ב-Google Drive וב-Google Sheets.", "success");
    loadDashboardData();
  } else {
    entry.syncStatus = "error";
    entry.syncLabel = "שגיאת סנכרון";
    entry.syncError = parsed.message || "שגיאה לא ידועה";
    showStatus(`הסנכרון נכשל: ${entry.syncError}`, "error");
    renderHistory();
  }

  persistEntries();
  finalizeSubmissionUI();
}

function finalizeSubmissionUI() {
  submittingEntryId = null;
  syncInFlight = false;
  setLoadingOverlay(false);
  submitBtn.disabled = false;
  submitBtn.textContent = "שמור דיווח";
  processNextSync();
}

function updateUnitOptions() {
  const spentByUnit = new Map();
  dashboardState.units.forEach((unit) => {
    spentByUnit.set(unit.unitName, Number(unit.totalAmount || 0));
  });

  Array.from(companySelect.options).forEach((option) => {
    if (!option.value) {
      return;
    }
    const budget = UNIT_BUDGETS[option.value];
    if (typeof budget !== "number") {
      option.textContent = option.value;
      return;
    }
    const spent = spentByUnit.get(option.value) || 0;
    const remaining = Math.max(0, budget - spent);
    option.textContent = `${option.value} - ${formatCurrency(remaining)}`;
  });
}

function formatPurchaseDate(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("he-IL");
  }
  return String(value).split("T")[0];
}

function getPreviewImageUrl(entry) {
  if (entry.fileData) {
    return entry.fileData;
  }
  const rawUrl = entry.driveFileUrl || entry.driveUrl || "";
  const fileIdMatch = rawUrl.match(/[-\w]{25,}/);
  if (!fileIdMatch) {
    return "";
  }
  return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w200`;
}

function setLoadingOverlay(isVisible) {
  loadingOverlay.classList.toggle("hidden", !isVisible);
}

function setDefaultPurchaseDate() {
  const dateInput = document.getElementById("purchaseDate");
  if (!dateInput) {
    return;
  }
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${year}-${month}-${day}`;
}

function saveSubmissionDefaults(payload) {
  if (payload.submitterName) {
    localStorage.setItem(LAST_NAME_KEY, payload.submitterName);
  }
  if (payload.company) {
    localStorage.setItem(LAST_UNIT_KEY, payload.company);
  }
  if (payload.role) {
    localStorage.setItem(LAST_ROLE_KEY, payload.role);
  }
}

function restoreSavedDefaults() {
  const savedName = localStorage.getItem(LAST_NAME_KEY) || "";
  const savedUnit = localStorage.getItem(LAST_UNIT_KEY) || "";
  const savedRole = localStorage.getItem(LAST_ROLE_KEY) || "";

  if (savedName) {
    document.getElementById("submitterName").value = savedName;
  }
  if (savedUnit) {
    companySelect.value = savedUnit;
  }
  if (savedRole) {
    document.getElementById("role").value = savedRole;
  }
}

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === "dismissed") {
        showInstallHelp();
      }
    } catch {
      showInstallHelp();
    }
    deferredInstallPrompt = null;
    return;
  }

  showInstallHelp();
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Ignore registration failure.
    });
  });
}

function showInstallHelp() {
  if (isIos()) {
    installHelpText.textContent = 'ב-iPhone פתח את תפריט השיתוף בדפדפן ואז בחר "הוסף למסך הבית".';
  } else {
    installHelpText.textContent = 'אם לא הופיע חלון התקנה, פתח את תפריט הדפדפן ובחר "Install app" או "Add to Home screen".';
  }
  installHelpOverlay.classList.remove("hidden");
}

function getScriptUrl() {
  return APPS_SCRIPT_URL || localStorage.getItem(SCRIPT_URL_KEY) || "";
}

function buildLocalDashboardState_(message) {
  return {
    generatedAt: new Date().toISOString(),
    units: [],
    recentReports: [],
    loaded: true,
    error: message
  };
}

function formatCurrency(amount) {
  const numeric = Number(amount || 0);
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2
  }).format(numeric);
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "";
  }
  return new Date(isoString).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
