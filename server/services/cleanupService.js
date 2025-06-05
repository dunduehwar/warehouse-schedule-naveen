const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

/**
 * Service to handle cleaning up temporary files
 */
class CleanupService {
          constructor(options = {}) {
                    this.uploadDir = options.uploadDir || path.join(__dirname, '..', 'uploads');
                    this.exportDir = options.exportDir || path.join(__dirname, '..', 'exports');
                    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    this.cleanupInterval = options.cleanupInterval || 60 * 60 * 1000; // 1 hour in milliseconds

                    // Keep track of scheduled cleanup intervals
                    this.scheduledCleanups = [];

                    // Statistics for monitoring
                    this.stats = {
                              lastRun: null,
                              filesDeleted: 0,
                              totalSizeRecovered: 0,
                              errors: []
                    };
          }

          /**
           * Start the automatic cleanup process
           */
          startAutomaticCleanup() {
                    console.log('Starting automatic file cleanup service');

                    // Initial cleanup
                    this.cleanup();

                    // Schedule regular cleanups
                    const intervalId = setInterval(() => this.cleanup(), this.cleanupInterval);
                    this.scheduledCleanups.push(intervalId);

                    return this;
          }

          /**
           * Stop the automatic cleanup process
           */
          stopAutomaticCleanup() {
                    console.log('Stopping automatic file cleanup service');

                    this.scheduledCleanups.forEach(intervalId => clearInterval(intervalId));
                    this.scheduledCleanups = [];

                    return this;
          }

          /**
           * Clean up temporary files in upload and export directories
           */
          async cleanup() {
                    const now = Date.now();
                    let filesDeleted = 0;
                    let totalSizeRecovered = 0;
                    const errors = [];

                    try {
                              // Clean uploads directory
                              const uploadStats = await this.cleanDirectory(this.uploadDir, now);
                              filesDeleted += uploadStats.filesDeleted;
                              totalSizeRecovered += uploadStats.sizeRecovered;
                              errors.push(...uploadStats.errors);

                              // Clean exports directory
                              const exportStats = await this.cleanDirectory(this.exportDir, now);
                              filesDeleted += exportStats.filesDeleted;
                              totalSizeRecovered += exportStats.sizeRecovered;
                              errors.push(...exportStats.errors);

                              // Update statistics
                              this.stats = {
                                        lastRun: new Date(),
                                        filesDeleted,
                                        totalSizeRecovered,
                                        errors
                              };

                              console.log(`Cleanup completed: ${filesDeleted} files deleted, ${(totalSizeRecovered / 1024 / 1024).toFixed(2)}MB recovered`);

                              return this.stats;
                    } catch (error) {
                              console.error('Cleanup error:', error);
                              errors.push(error.message);

                              this.stats = {
                                        lastRun: new Date(),
                                        filesDeleted,
                                        totalSizeRecovered,
                                        errors
                              };

                              return this.stats;
                    }
          }

          /**
           * Clean files in a specific directory
           * @param {string} directory - Directory path to clean
           * @param {number} now - Current timestamp
           * @returns {Object} Cleanup statistics
           */
          async cleanDirectory(directory, now) {
                    let filesDeleted = 0;
                    let sizeRecovered = 0;
                    const errors = [];

                    // Ensure directory exists
                    if (!fs.existsSync(directory)) {
                              fs.mkdirSync(directory, { recursive: true });
                              return { filesDeleted, sizeRecovered, errors };
                    }

                    try {
                              const files = await readdir(directory);

                              // Process each file
                              for (const file of files) {
                                        const filePath = path.join(directory, file);

                                        try {
                                                  const stats = await stat(filePath);

                                                  // Skip directories
                                                  if (stats.isDirectory()) continue;

                                                  // Check if file is older than maxAge
                                                  if (now - stats.mtimeMs > this.maxAge) {
                                                            const fileSize = stats.size;

                                                            // Delete the file
                                                            await unlink(filePath);

                                                            filesDeleted++;
                                                            sizeRecovered += fileSize;
                                                            console.log(`Deleted old file: ${filePath} (${(fileSize / 1024).toFixed(2)}KB)`);
                                                  }
                                        } catch (fileError) {
                                                  const errorMessage = `Error processing file ${filePath}: ${fileError.message}`;
                                                  console.error(errorMessage);
                                                  errors.push(errorMessage);
                                        }
                              }
                    } catch (dirError) {
                              const errorMessage = `Error reading directory ${directory}: ${dirError.message}`;
                              console.error(errorMessage);
                              errors.push(errorMessage);
                    }

                    return { filesDeleted, sizeRecovered, errors };
          }

          /**
           * Get cleanup statistics
           * @returns {Object} Cleanup statistics
           */
          getStats() {
                    return this.stats;
          }
}

module.exports = CleanupService; 