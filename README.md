# GetRecipts

Mobile-first Hebrew receipt submission app with free persistence through Google Apps Script, Google Sheets, and Google Drive.

## Files

- `index.html` - main app
- `styles.css` - mobile-first styling
- `app.js` - frontend logic, local storage, retry sync, hidden iframe bridge
- `apps-script/Code.gs` - Google Apps Script backend

## What it does

- Works well on phones first, desktop second
- Lets the user take a receipt photo or upload one
- Saves every submission locally on the device
- Syncs to Google Drive and Google Sheets when Apps Script is configured
- Keeps failed uploads visible and retryable

## Google Sheet columns

Each unit will automatically get its own tab inside the same Google Sheet. Every tab will use this header row:

1. `timestamp`
2. `company`
3. `submitterName`
4. `role`
5. `amount`
6. `purchaseDate`
7. `comments`
8. `fileName`
9. `driveFileUrl`
10. `syncStatus`
11. `localId`

## Setup

1. Create a Google Sheet that will act as the central workbook.
2. Create a folder in Google Drive for receipt images and copy its folder ID from the URL.
3. From inside that Google Sheet, open `Extensions -> Apps Script`.
4. Paste the code from `apps-script/Code.gs` into the bound Apps Script project.
5. Replace only:
   - `PUT_YOUR_DRIVE_FOLDER_ID_HERE`
6. Deploy the script as a Web App.
7. Set:
   - `Execute as: Me`
   - `Who has access: Anyone`
8. Copy the Web App URL.
9. Open `index.html` in the browser.
10. In the app, open `הגדרות חיבור` and paste the Web App URL.

## How unit tabs work

- The script uses the selected `company` / unit from the form.
- It looks for a tab with that exact unit name.
- If the tab does not exist, it creates it automatically.
- It writes the submission into that unit's tab.
- It also creates the header row automatically for new tabs.

## Sync architecture

The frontend does not use `fetch(..., { mode: "no-cors" })`.

Instead, it submits the payload to Apps Script through a hidden iframe form post. Apps Script returns a small HTML response that calls `window.top.postMessage(...)` back to the app. That gives the frontend a real success/error result without requiring a paid backend.

## Notes

- The app keeps recent submissions in `localStorage`, so they remain visible on the same device.
- This is not a multi-user database. The shared record of truth is Google Sheets plus Google Drive.
- If a sync fails, the user can retry from the recent submissions list.
