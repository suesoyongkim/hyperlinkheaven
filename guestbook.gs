/**
 * SOYONG'S PUBLIC GUESTBOOK — Google Apps Script
 * Standalone script — writes to the spreadsheet identified by SPREADSHEET_ID.
 * Deploy as a Web App: Execute as Me / Who has access: Anyone.
 * Paste the /exec URL into PUBLIC_GUESTBOOK_URL in index.html.
 * Sheet tab 'Guestbook' will be created automatically.
 */
const SHEET_NAME = 'Guestbook';
const SPREADSHEET_ID = '1dOfMP8L94LLL5L5AK9ln5S0BOfl95EN4aCMqmDi8h6E';
const MAX_RECORDS_RETURNED = 100;

/** SHARED SITE COUNTER — persisted in the user's Google Spreadsheet.
 *  The server stores one aggregate number, not IP addresses or device IDs.
 *  The page counts page loads rather than unique people. Public counters
 *  cannot guarantee unique visitors or block automated requests.
 */
const STATS_SHEET_NAME = 'SiteStats';
function siteVisitorCount_(increment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(STATS_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(STATS_SHEET_NAME);
      sheet.getRange('A1:B2').setValues([['Metric', 'Count'], ['Visits', 0]]);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 150);
      sheet.setColumnWidth(2, 100);
    }
    const cell = sheet.getRange('B2');
    let count = Number(cell.getValue());
    if (!Number.isFinite(count) || count < 0) count = 0;
    count = Math.floor(count);
    if (increment) {
      count += 1;
      cell.setValue(count);
    }
    return count;
  } finally { lock.releaseLock(); }
}


/** Run this once in Apps Script to test spreadsheet permission and initialize SiteStats. */
function testVisitorCounter() {
  const count = siteVisitorCount_(false);
  Logger.log('Visitor counter ready. SiteStats!B2 = ' + count);
  return count;
}


function bookSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) throw new Error('Cannot open the guestbook spreadsheet.');
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Created At', 'Name', 'Message']);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 540);
  }
  return sheet;
}

function clean_(value, limit) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, limit);
}

function outputJsonp_(data, callback) {
  let output = JSON.stringify(data).replace(/</g, '\\u003c');
  if (callback && /^[A-Za-z_$][\w$]{0,79}$/.test(callback)) {
    output = callback + '(' + output + ');';
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || '';
  const action = (e && e.parameter && e.parameter.action) || 'list';
  try {
    // JSONP supports static GitHub Pages as well as a locally opened HTML file.
    // 'visit' increments the shared count; 'count' retrieves it without incrementing.
    if (action === 'visit' || action === 'count') {
      return outputJsonp_({ok:true, count:siteVisitorCount_(action === 'visit')}, callback);
    }
    // The GIF upload/gallery feature has been retired.
    if (action !== 'list') return outputJsonp_({ok:false,error:'Unknown action.'}, callback);
    const sheet = bookSheet_();
    const last = sheet.getLastRow();
    if (last <= 1) return outputJsonp_({ok:true,entries:[]}, callback);
    const start = Math.max(2, last - MAX_RECORDS_RETURNED + 1);
    const values = sheet.getRange(start, 1, last - start + 1, 3).getValues();
    const zone = Session.getScriptTimeZone();
    const entries = values.map(row => ({
      date: row[0] instanceof Date ? Utilities.formatDate(row[0], zone, 'yyyy-MM-dd HH:mm') : String(row[0]),
      name: String(row[1] || 'GUEST'),
      message: String(row[2] || '')
    }));
    return outputJsonp_({ok:true,entries:entries}, callback);
  } catch (err) {
    return outputJsonp_({ok:false,error:'Guestbook not available.'}, callback);
  }
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  // Refuse old anonymous GIF uploads even if someone still knows the old URL.
  if (p.action === 'gif_upload') return outputJsonp_({ok:false,error:'GIF uploads are disabled.'}, '');
  try {
    if (p.website) return outputJsonp_({ok:false,error:'Spam rejected.'}, '');
    const name = clean_(p.name, 28);
    const message = clean_(p.message, 300);
    if (!name || !message || name.length > 28 || message.length > 300) {
      return outputJsonp_({ok:false,error:'Name and message required.'}, '');
    }
    if (/https?:\/\/|www\./i.test(message)) {
      return outputJsonp_({ok:false,error:'External links are disabled.'}, '');
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = bookSheet_();
      const last = sheet.getLastRow();
      if (last > 1) {
        const recent = sheet.getRange(Math.max(2, last - 30), 1, Math.min(30, last - 1), 3).getValues();
        if (recent.some(row => String(row[1]) === name && String(row[2]) === message)) {
          return outputJsonp_({ok:true,duplicate:true}, '');
        }
      }
      // Prefix user strings starting with formula characters to prevent Sheet formula injection.
      function safeCell_(value){ return /^[=+@\-]/.test(value) ? "'" + value : value; }
      sheet.appendRow([new Date(), safeCell_(name), safeCell_(message)]);
    } finally {
      lock.releaseLock();
    }
    return outputJsonp_({ok:true}, '');
  } catch (err) {
    return outputJsonp_({ok:false,error:'Could not save message.'}, '');
  }
}


