# RSVP Google Sheets Integration Setup

This guide will help you set up the RSVP form to save responses to your Google Sheet.

## Step 1: Set Up Google Apps Script

1. **Open your Google Sheet**
   - Go to: https://docs.google.com/spreadsheets/d/1ADSdrGzOl-kn_qwXLaK4O5fJdwrc6HOGjv15v8Ldd4k/edit

2. **Open Apps Script Editor**
   - Click on **Extensions** → **Apps Script** in the menu bar
   - This will open a new tab with the Apps Script editor

3. **Add the Script Code**
   - Delete any existing code in the editor
   - Open the file `google-apps-script.js` from this project
   - Copy the entire contents and paste it into the Apps Script editor
   - The script is already configured with your Sheet ID, but you can verify it matches

4. **Save the Script**
   - Click the **Save** icon (💾) or press `Cmd+S` (Mac) / `Ctrl+S` (Windows)
   - Give it a name like "RSVP Handler" if prompted

5. **Deploy as Web App**
   - Click **Deploy** → **New deployment**
   - Click the gear icon ⚙️ next to "Select type" and choose **Web app**
   - Configure the deployment:
     - **Description**: "RSVP Form Handler" (optional)
     - **Execute as**: **Me** (your Google account)
     - **Who has access**: **Anyone** ⚠️ **IMPORTANT**: Must be "Anyone" (not "Anyone with Google account")
   - Click **Deploy**
   - You may need to authorize the script:
     - Click **Authorize access**
     - Choose your Google account
     - Click **Advanced** → **Go to [Project Name] (unsafe)**
     - Click **Allow**
   
   **⚠️ Important**: If you get a 403 error, you may need to:
   - Make sure "Who has access" is set to **"Anyone"** (not "Anyone with Google account")
   - Create a **NEW deployment** (don't edit the old one) - click "New deployment" again
   - Copy the NEW URL from the new deployment

6. **Copy the Web App URL**
   - After deployment, you'll see a "Web app" section with a URL
   - Copy this URL (it looks like: `https://script.google.com/macros/s/.../exec`)
   - **Important**: Keep this URL private - anyone with it can submit RSVPs

## Step 2: Update Your Website

1. **Open `index.html`**
   - Find the line near the top of the `<script>` section that says:
     ```javascript
     const RSVP_API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
     ```

2. **Replace the URL**
   - Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual Apps Script URL
   - Make sure to keep the quotes around the URL
   - Example:
     ```javascript
     const RSVP_API_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
     ```

3. **Save and Test**
   - Save the file
   - Test the RSVP form on your website
   - Check your Google Sheet to see if the data appears

## Step 3: Verify the Setup

1. **Test the Form**
   - Fill out the RSVP form on your website
   - Submit it
   - You should see a success message

2. **Check Your Google Sheet**
   - Open your Google Sheet
   - You should see a new row with:
     - Column A: Name
     - Column B: Meal Preference (vegetarian/meat)
     - Column C: Timestamp
     - Column D: Updated (Yes/No)

3. **Test Updates**
   - Submit the form again with the same name but different meal preference
   - The existing row should be updated (not create a new row)
   - Column D should show "Yes"

## Troubleshooting

### "RSVP API URL not configured" Error
- Make sure you've replaced `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with your actual URL
- Check that the URL is in quotes

### 403 Forbidden Error
- **Most common fix**: Create a NEW deployment (don't edit the existing one)
  - Go to **Deploy** → **Manage deployments**
  - Click the **+** button to create a new deployment
  - Make sure "Who has access" is set to **"Anyone"** (not "Anyone with Google account")
  - Copy the NEW URL and update it in your website
- Make sure the URL ends with `/exec` (not `/dev`)
- Try accessing the URL directly in your browser - it should show JSON response

### "Failed to submit RSVP" Error
- Check the browser console (F12) for detailed error messages
- Verify the Apps Script is deployed and accessible
- Make sure "Who has access" is set to "Anyone" in the deployment settings

### Data Not Appearing in Sheet
- Check that the Sheet ID in the script matches your sheet
- Verify the sheet name is correct (default is "Sheet1")
- Check Apps Script execution logs: **Executions** in the Apps Script editor

### CORS Errors
- The current implementation uses GET requests with query parameters to avoid CORS issues
- If you still see errors:
  - Make sure the deployment is set to "Anyone" access
  - Try redeploying the script
  - The script now handles both GET and POST requests

## Security Notes

- The Web App URL allows anyone to submit RSVPs if they know the URL
- Consider adding basic validation or rate limiting if needed
- For production, you might want to add additional security measures
- The script checks for duplicate names and updates existing entries

## Sheet Structure

The script will automatically create headers if your sheet is empty:
- **Column A**: Name
- **Column B**: Meal Preference
- **Column C**: Timestamp
- **Column D**: Updated (Yes if updated, No if new)

You can add more columns manually, but the script will only write to these four columns.
