# Getting Started with Excel Viewer App

This application consists of a backend API for processing Excel files and a React frontend for viewing and editing them.

## Starting the Backend Server

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies (if not already done):

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

   The server will run on port 3001 by default.

## Starting the Frontend Application

1. Open a new terminal window/tab
2. Navigate to the client directory:

   ```bash
   cd client
   ```

3. Install dependencies (if not already done):

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm start
   ```

   The React application will run on port 3000 by default.

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Using the Application

1. Click the "Upload Excel File" button to select and upload an Excel file (.xlsx or .xls)
2. Once uploaded, you'll see the file name and a dropdown to select different sheets
3. View and edit the data in the spreadsheet-like interface
4. Click "Save Changes" to save your edits
5. Click "Export Excel" to download the modified Excel file

## Troubleshooting

### API Connection Issues

If the frontend can't connect to the backend:

1. Verify both servers are running
2. Check that the backend is running on port 3001
3. Ensure the proxy setting in client/package.json points to http://localhost:3001

### File Upload Issues

1. Ensure you're uploading valid Excel files (.xlsx or .xls)
2. File size must be under 10MB
3. Check browser console for error messages

### Data Not Loading

1. The Excel file must contain at least one sheet
2. The sheet must contain data in a tabular format
