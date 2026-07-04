# Apps Script Structure

This folder is now split into small Google Apps Script files so it is easier to read and paste into the Apps Script editor.

## Files

- `00_Config.gs` - constants, headers, email recipients, embedded email header image
- `10_WebApp.gs` - `doGet`, `doPost`, and iframe bridge response
- `20_Storage.gs` - Drive upload helpers and per-unit sheet setup
- `30_Dashboard.gs` - dashboard JSONP response and sheet aggregation
- `40_Notifications.gs` - queueing, trigger creation, and email sending
- `41_EmailTemplates.gs` - branded HTML/plain-text email templates
- `50_Utils.gs` - shared formatting, escaping, and conversion helpers

## How to deploy

1. Open the bound Google Sheet.
2. Open `Extensions -> Apps Script`.
3. Replace the existing script files with the `.gs` files from this folder.
4. Save the project.
5. Deploy or redeploy as a Web App.
6. Keep `Execute as: Me` and `Who has access: Anyone`.

## Manual mail trigger

Email sending is queued during upload, but the queue processor must be run separately.

To enable automatic emails:

1. In Apps Script, click the clock icon `Triggers`.
2. Create a new trigger for `processNotificationQueue`.
3. Choose:
   - Event source: `Time-driven`
   - Type of time based trigger: `Minutes timer`
   - Interval: `Every 1 minute` or `Every 5 minutes`
4. Save and approve permissions.

If you want to test mail immediately, run `processNotificationQueue` manually once from the Apps Script editor.

Apps Script loads all `.gs` files in the same project automatically, so the filenames are for organization only.
