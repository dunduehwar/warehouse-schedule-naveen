const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const excelRoutes = require('./routes/excel');
const CleanupService = require('./services/cleanupService');
const ErrorLogger = require('./services/errorLogger');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const errorLogger = new ErrorLogger();

// Middleware
app.use(cors());
app.use(express.json());

// Add logging middleware
app.use(errorLogger.createMiddleware());

// Ensure upload and export directories exist
const uploadDir = path.join(__dirname, 'uploads');
const exportsDir = path.join(__dirname, 'exports');

if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(exportsDir)) {
          fs.mkdirSync(exportsDir, { recursive: true });
}

// Routes
app.use('/api/excel', excelRoutes);

// Serve exported files
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// Initialize the cleanup service
const cleanupService = new CleanupService({
          maxAge: process.env.FILE_CLEANUP_MAX_AGE ? parseInt(process.env.FILE_CLEANUP_MAX_AGE) : 24 * 60 * 60 * 1000, // Default 24h
          cleanupInterval: process.env.FILE_CLEANUP_INTERVAL ? parseInt(process.env.FILE_CLEANUP_INTERVAL) : 60 * 60 * 1000 // Default 1h
});

// Start the cleanup service
cleanupService.startAutomaticCleanup();

// Graceful shutdown to stop the cleanup service
process.on('SIGTERM', () => {
          console.log('SIGTERM signal received: closing HTTP server');
          cleanupService.stopAutomaticCleanup();
          server.close(() => {
                    console.log('HTTP server closed');
                    process.exit(0);
          });
});

// Error handling middleware
app.use(errorLogger.createErrorHandler());

// Start server
const server = app.listen(PORT, () => {
          console.log(`Server running on port ${PORT}`);
});