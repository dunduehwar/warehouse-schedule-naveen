# Warehouse Management System

A full-stack web application for managing and manipulating Excel files. This application allows users to upload Excel files, view and edit sheet data, and export the modified files.

## Features

### File Management

- Upload Excel files (.xlsx and .xls formats)
- View list of sheet names in an Excel file
- Switch between different sheets in the same file
- Export modified Excel files

### Data Manipulation

- View sheet data in a user-friendly grid format
- Edit cell values directly in the browser
- Add new rows and columns
- Delete rows and columns
- Sort and filter data

### User Experience

- Responsive design for desktop and mobile
- Real-time validation of data
- Network status monitoring
- Error boundary to prevent application crashes
- Toast notifications for operation status

### Backend Services

- REST API for Excel operations
- File validation and size limiting (10MB max)
- Automatic cleanup of old files (after 24 hours)
- Detailed error logging

## File Structure

```
wherhouse/
├── client/                     # Frontend React application
│   ├── public/                 # Static files
│   └── src/                    # Source files
│       ├── components/         # React components
│       │   ├── DataViewer.tsx  # Main data grid component
│       │   ├── ErrorBoundary.tsx  # Error handling component
│       │   ├── ExportButton.tsx   # File export component
│       │   ├── ExportPanel.tsx    # Export options panel
│       │   ├── FileUpload.tsx     # File upload component
│       │   ├── NetworkStatusMonitor.tsx  # Network status component
│       │   └── SheetSelector.tsx  # Sheet selection component
│       ├── utils/              # Utility functions
│       │   └── api.ts          # API client configuration
│       ├── App.tsx             # Main application component
│       └── index.tsx           # Application entry point
├── server/                     # Backend Node.js server
│   ├── routes/                 # API routes
│   │   └── excel.js            # Excel file handling routes
│   ├── services/               # Business logic services
│   │   ├── cleanupService.js   # Automatic file cleanup
│   │   ├── errorLogger.js      # Error logging service
│   │   └── excelService.js     # Excel processing service
│   ├── uploads/                # Uploaded files directory
│   ├── exports/                # Exported files directory
│   └── server.js               # Server entry point
└── package.json                # Root package.json for running both client and server
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Installation and Setup

### Option 1: Quick Start

1. Clone the repository
2. Install all dependencies:

```bash
npm run install-all
```

3. Start both the client and server:

```bash
npm start
```

The frontend will be available at http://localhost:3000
The backend will be running at http://localhost:3001

### Option 2: Manual Setup

1. Clone the repository

2. Install root dependencies:

```bash
npm install
```

3. Install server dependencies:

```bash
cd server
npm install
```

4. Install client dependencies:

```bash
cd client
npm install
```

5. Start the server:

```bash
cd server
npm run dev
```

6. In a separate terminal, start the client:

```bash
cd client
npm start
```

## How to Use

1. Open your browser and navigate to http://localhost:3000
2. Use the file upload area to upload an Excel file (.xlsx or .xls)
3. Select a sheet from the dropdown menu
4. View and edit the data in the grid
5. Use the export button to download the modified Excel file

## Troubleshooting

### Common Issues

1. **File upload fails**

   - Ensure the file is a valid Excel file (.xlsx or .xls)
   - Check that the file size is under 10MB
   - Verify that the file is not corrupted by opening it in Excel

2. **Server connection errors**

   - Check that both the client and server are running
   - Verify that the ports 3000 and 3001 are not in use by other applications
   - Check that the proxy setting in client/package.json points to the correct server URL

3. **Data not displaying correctly**

   - Try refreshing the page
   - Try uploading the file again
   - Check the console for any error messages

4. **Export not working**

   - Ensure you've made changes to the data
   - Check the network tab in browser developer tools for error responses
   - Verify that the exports directory on the server is writable

5. **"Network Offline" message**
   - Check your internet connection
   - Verify that the server is running
   - Try restarting both client and server

### Advanced Troubleshooting

If the above solutions don't resolve your issue:

1. Check the server logs for error messages
2. Clear your browser cache and cookies
3. Try using a different browser
4. Check for any firewall or antivirus software blocking the connections

## Development

### Environment Variables

#### Client

Create a `.env` file in the client directory with the following:

```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_TIMEOUT=30000
```

#### Server

Create a `.env` file in the server directory with the following:

```
PORT=3001
FILE_CLEANUP_INTERVAL=86400000  # 24 hours in milliseconds
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Building for Production

1. Build the client:

```bash
cd client
npm run build
```

2. Set up the server for production:

```bash
cd server
NODE_ENV=production npm start
```

## License

This project is licensed under the ISC License
