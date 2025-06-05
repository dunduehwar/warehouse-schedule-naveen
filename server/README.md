# Excel Processor Server

A Node.js backend server for processing Excel files.

## Features

- File upload with size limit (10MB)
- Excel file parsing and manipulation
- In-memory workbook storage
- Automatic file cleanup
- RESTful API for Excel operations

## API Endpoints

- **POST /api/upload** - Upload Excel file

  - Returns fileId and sheet names
  - Accepts multipart/form-data with 'file' field

- **GET /api/sheets/:fileId** - Get sheet names for a file

  - Returns array of sheet names

- **GET /api/data/:fileId/:sheetName** - Get data from a specific sheet

  - Returns sheet data as a 2D array

- **PUT /api/data/:fileId/:sheetName** - Update data in a specific sheet

  - Accepts JSON body with 'data' field (2D array)

- **POST /api/export/:fileId** - Export the modified Excel file
  - Returns download URL for the exported file

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

3. For development with auto-restart:
   ```
   npm run dev
   ```

## Configuration

- Server runs on port 3001 by default
- CORS is enabled for all origins
- File uploads are limited to 10MB
- Temporary files are cleaned up after 1 hour
