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
    let firstName, lastName, meal;
    
    if (e.postData && e.postData.contents) {
      // Try to parse as JSON first
      try {
        const requestData = JSON.parse(e.postData.contents);
        firstName = requestData.firstName;
        lastName = requestData.lastName;
        meal = requestData.meal;
      } catch (jsonError) {
        // If not JSON, parse as form data
        const params = e.parameter;
        firstName = params.firstName;
        lastName = params.lastName;
        meal = params.meal;
      }
    } else {
      // Fallback to parameter parsing (form data)
      const params = e.parameter;
      firstName = params.firstName;
      lastName = params.lastName;
      meal = params.meal;
    }
    
    // Validate input
    if (!firstName || !lastName || !meal) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'First name, last name, and meal preference are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['First Name', 'Last Name', 'Meal Preference', 'Timestamp']);
    }
    
    // Always create a new entry (don't check for duplicates)
    // This allows multiple people with the same name to RSVP
    const timestamp = new Date();
    sheet.appendRow([firstName, lastName, meal, timestamp]);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'RSVP submitted successfully'
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
    const firstName = params.firstName;
    const lastName = params.lastName;
    const meal = params.meal;
    
    // Validate input
    if (!firstName || !lastName || !meal) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'First name, last name, and meal preference are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['First Name', 'Last Name', 'Meal Preference', 'Timestamp']);
    }
    
    // Always create a new entry (don't check for duplicates)
    // This allows multiple people with the same name to RSVP
    const timestamp = new Date();
    sheet.appendRow([firstName, lastName, meal, timestamp]);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'RSVP submitted successfully'
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
