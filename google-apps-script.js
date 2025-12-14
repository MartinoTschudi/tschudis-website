/**
 * Google Apps Script for RSVP Form
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1ADSdrGzOl-kn_qwXLaK4O5fJdwrc6HOGjv15v8Ldd4k/edit
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Update the SPREADSHEET_ID below if needed (it should match your sheet)
 * 5. Click "Deploy" > "New deployment"
 * 6. Select type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone" (or "Anyone with Google account" if you want some security)
 * 9. Click "Deploy"
 * 10. Copy the Web App URL and use it in your website
 */

// Replace with your Google Sheet ID (found in the URL)
const SPREADSHEET_ID = '1ADSdrGzOl-kn_qwXLaK4O5fJdwrc6HOGjv15v8Ldd4k';
const SHEET_NAME = 'Sheet1'; // Change if your sheet has a different name

/**
 * Handle POST requests from the RSVP form
 */
function doPost(e) {
  try {
    // Parse the request data - handle both JSON and form data
    let name, meal;
    
    if (e.postData && e.postData.contents) {
      // Try to parse as JSON first
      try {
        const requestData = JSON.parse(e.postData.contents);
        name = requestData.name;
        meal = requestData.meal;
      } catch (jsonError) {
        // If not JSON, parse as form data
        const params = e.parameter;
        name = params.name;
        meal = params.meal;
      }
    } else {
      // Fallback to parameter parsing (form data)
      const params = e.parameter;
      name = params.name;
      meal = params.meal;
    }
    
    // Validate input
    if (!name || !meal) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Name and meal preference are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Name', 'Meal Preference', 'Timestamp', 'Updated']);
    }
    
    // Check if this name already exists
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let isUpdate = false;
    
    // Start from row 2 (skip header)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === name.toLowerCase()) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        isUpdate = true;
        break;
      }
    }
    
    const timestamp = new Date();
    
    if (isUpdate) {
      // Update existing row
      sheet.getRange(rowIndex, 2).setValue(meal); // Update meal preference
      sheet.getRange(rowIndex, 3).setValue(timestamp); // Update timestamp
      sheet.getRange(rowIndex, 4).setValue('Yes'); // Mark as updated
    } else {
      // Add new row
      sheet.appendRow([name, meal, timestamp, 'No']);
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        isUpdate: isUpdate,
        message: isUpdate ? 'RSVP updated successfully' : 'RSVP submitted successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (used to avoid CORS issues)
 */
function doGet(e) {
  try {
    // Get parameters from query string
    const params = e.parameter;
    const name = params.name;
    const meal = params.meal;
    
    // Validate input
    if (!name || !meal) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Name and meal preference are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Name', 'Meal Preference', 'Timestamp', 'Updated']);
    }
    
    // Check if this name already exists
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let isUpdate = false;
    
    // Start from row 2 (skip header)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === name.toLowerCase()) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        isUpdate = true;
        break;
      }
    }
    
    const timestamp = new Date();
    
    if (isUpdate) {
      // Update existing row
      sheet.getRange(rowIndex, 2).setValue(meal); // Update meal preference
      sheet.getRange(rowIndex, 3).setValue(timestamp); // Update timestamp
      sheet.getRange(rowIndex, 4).setValue('Yes'); // Mark as updated
    } else {
      // Add new row
      sheet.appendRow([name, meal, timestamp, 'No']);
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        isUpdate: isUpdate,
        message: isUpdate ? 'RSVP updated successfully' : 'RSVP submitted successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
