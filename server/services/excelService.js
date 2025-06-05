const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Store active workbooks in memory
const activeWorkbooks = {};

// Create a simple in-memory cache for sheet data
const sheetDataCache = {
          cache: {},
          maxCacheSize: 20, // Maximum number of sheets to cache
          get: function (cacheKey) {
                    return this.cache[cacheKey];
          },
          set: function (cacheKey, data) {
                    // Implement simple LRU by tracking last access time
                    this.cache[cacheKey] = {
                              data,
                              timestamp: Date.now()
                    };

                    // Clean cache if it gets too large
                    this.cleanCache();
          },
          invalidate: function (fileId) {
                    // Remove all cache entries for a specific file
                    Object.keys(this.cache).forEach(key => {
                              if (key.startsWith(`${fileId}:`)) {
                                        delete this.cache[key];
                              }
                    });
          },
          cleanCache: function () {
                    const cacheEntries = Object.keys(this.cache);
                    if (cacheEntries.length <= this.maxCacheSize) return;

                    // Sort entries by timestamp and remove oldest
                    const sortedEntries = cacheEntries
                              .map(key => ({ key, timestamp: this.cache[key].timestamp }))
                              .sort((a, b) => a.timestamp - b.timestamp);

                    // Remove oldest entries to get back to maxCacheSize
                    const entriesToRemove = sortedEntries.slice(0, cacheEntries.length - this.maxCacheSize);
                    entriesToRemove.forEach(entry => {
                              delete this.cache[entry.key];
                    });
          }
};

/**
 * Validate Excel file
 * @param {Object} file - Uploaded file object from multer
 * @returns {Object} Validation result with success and message
 */
const validateExcelFile = (file) => {
          // Check file extension
          const ext = path.extname(file.originalname).toLowerCase();
          const supportedExts = ['.xlsx', '.xls', '.csv', '.ods', '.tsv', '.txt', '.xlsm', '.xlsb', '.xltx', '.xltm', '.xlam'];
          if (!supportedExts.includes(ext)) {
                    return {
                              success: false,
                              message: 'Only spreadsheet files (.xlsx, .xls, .csv, .ods, .tsv, etc.) are allowed'
                    };
          }

          // Check file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
                    return {
                              success: false,
                              message: 'File size exceeds the 10MB limit'
                    };
          }

          try {
                    // Try to read the file to verify it's a valid spreadsheet file
                    const workbook = xlsx.readFile(file.path, {
                              type: 'binary',
                              cellDates: true,
                              cellNF: false,
                              cellText: false
                    });
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                              return {
                                        success: false,
                                        message: 'Invalid spreadsheet file: No worksheets found'
                              };
                    }
                    return { success: true };
          } catch (error) {
                    console.error('Spreadsheet validation error:', error);
                    return {
                              success: false,
                              message: 'Invalid spreadsheet file format'
                    };
          }
};

/**
 * Process uploaded Excel file
 * @param {Object} file - Uploaded file object from multer
 * @returns {Object} File info including fileId and sheet names
 */
const processExcelFile = (file) => {
          try {
                    // Validate file
                    const validation = validateExcelFile(file);
                    if (!validation.success) {
                              throw new Error(validation.message);
                    }

                    // Check if file exists
                    if (!fs.existsSync(file.path)) {
                              throw new Error('File not found on server. Upload may have failed.');
                    }

                    const filePath = file.path;

                    // Use try-catch to handle specific parsing errors
                    let workbook;
                    try {
                              // Use readFile with optimized options for large files
                              workbook = xlsx.readFile(filePath, {
                                        cellFormula: true,
                                        cellStyles: true,
                                        cellDates: true,
                                        cellNF: true,
                                        cellHTML: false, // Disable HTML output for better performance
                                        sheetStubs: false, // Ignore empty cells for memory efficiency
                                        memory: true, // Use memory optimization
                                        WTF: false, // Disable strict parsing to increase performance
                              });
                    } catch (readError) {
                              console.error('Error reading Excel file:', readError);
                              throw new Error(`Cannot read the Excel file: ${readError.message}`);
                    }

                    // Validate workbook has sheets
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                              throw new Error('Invalid Excel file: No worksheets found');
                    }

                    // Generate unique fileId
                    const fileId = uuidv4();

                    // Store workbook in memory
                    activeWorkbooks[fileId] = {
                              workbook,
                              filePath,
                              originalName: file.originalname,
                              timestamp: Date.now()
                    };

                    // Get sheet names
                    const sheetNames = workbook.SheetNames;

                    return {
                              success: true,
                              fileId,
                              sheetNames,
                              originalName: file.originalname
                    };
          } catch (error) {
                    console.error('Error processing Excel file:', error);
                    throw new Error(error.message || 'Failed to process Excel file');
          }
};

/**
 * Get sheet names for a file
 * @param {string} fileId - File ID
 * @returns {Array} List of sheet names
 */
const getSheetNames = (fileId) => {
          if (!activeWorkbooks[fileId]) {
                    throw new Error('File not found');
          }

          return activeWorkbooks[fileId].workbook.SheetNames;
};

/**
 * Get data from a specific sheet
 * @param {string} fileId - File ID
 * @param {string} sheetName - Sheet name
 * @param {Object} options - Options for pagination
 * @returns {Object} Sheet data and metadata
 */
const getSheetData = (fileId, sheetName, options = {}) => {
          if (!activeWorkbooks[fileId]) {
                    throw new Error('File not found');
          }

          const workbook = activeWorkbooks[fileId].workbook;

          if (!workbook.SheetNames.includes(sheetName)) {
                    throw new Error('Sheet not found');
          }

          // Generate cache key
          const cacheKey = `${fileId}:${sheetName}:${options.page || 0}:${options.pageSize || 0}`;

          // Check if data is in cache
          const cachedData = sheetDataCache.get(cacheKey);
          if (cachedData) {
                    return cachedData.data;
          }

          const worksheet = workbook.Sheets[sheetName];

          // Get workbook range to determine data size
          const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const totalRows = range.e.r - range.s.r + 1;

          // Apply pagination if requested
          let paginationOptions = {};
          if (options.page && options.pageSize) {
                    const startRow = (options.page - 1) * options.pageSize;
                    const endRow = Math.min(startRow + options.pageSize, totalRows);
                    paginationOptions = {
                              range: xlsx.utils.encode_range({
                                        s: { r: startRow, c: range.s.c },
                                        e: { r: endRow - 1, c: range.e.c }
                              })
                    };
          }

          // Use sheet_to_json with optimized options
          const data = xlsx.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false, // Convert types for better consistency
                    defval: '', // Default value for empty cells
                    ...paginationOptions
          });

          const result = {
                    data,
                    totalRows,
                    totalColumns: range.e.c - range.s.c + 1
          };

          // Cache the result
          sheetDataCache.set(cacheKey, result);

          return result;
};

/**
 * Update data in a specific sheet
 * @param {string} fileId - File ID
 * @param {string} sheetName - Sheet name
 * @param {Array} data - New sheet data as array of arrays
 */
const updateSheetData = (fileId, sheetName, data) => {
          if (!activeWorkbooks[fileId]) {
                    throw new Error('File not found');
          }

          const workbook = activeWorkbooks[fileId].workbook;

          if (!workbook.SheetNames.includes(sheetName)) {
                    throw new Error('Sheet not found');
          }

          // Convert JSON data back to worksheet
          const worksheet = xlsx.utils.aoa_to_sheet(data);
          workbook.Sheets[sheetName] = worksheet;

          // Save changes to disk
          xlsx.writeFile(workbook, activeWorkbooks[fileId].filePath);

          // Update timestamp
          activeWorkbooks[fileId].timestamp = Date.now();

          // Invalidate cache for this file
          sheetDataCache.invalidate(fileId);
};

/**
 * Export the modified Excel file
 * @param {string} fileId - File ID
 * @returns {Object} Export info including path and original filename
 */
const exportExcelFile = (fileId) => {
          if (!activeWorkbooks[fileId]) {
                    throw new Error('File not found');
          }

          const workbook = activeWorkbooks[fileId].workbook;
          const originalName = activeWorkbooks[fileId].originalName;

          // Create a new file in the exports directory
          const exportFileName = `export-${uuidv4()}-${originalName}`;
          const exportPath = path.join(__dirname, '..', 'exports', exportFileName);

          // Write the workbook to the new file
          xlsx.writeFile(workbook, exportPath);

          return {
                    filePath: exportPath,
                    fileName: exportFileName,
                    originalName
          };
};

/**
 * Clean up old workbooks from memory and delete files
 * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
 */
const cleanupWorkbooks = (maxAge = 24 * 60 * 60 * 1000) => {
          const now = Date.now();

          Object.keys(activeWorkbooks).forEach(fileId => {
                    const workbook = activeWorkbooks[fileId];
                    if (now - workbook.timestamp > maxAge) {
                              // Delete the file from disk
                              try {
                                        if (fs.existsSync(workbook.filePath)) {
                                                  fs.unlinkSync(workbook.filePath);
                                                  console.log(`Deleted old file: ${workbook.filePath}`);
                                        }
                              } catch (err) {
                                        console.error(`Error deleting file ${workbook.filePath}:`, err);
                              }

                              // Remove from memory
                              delete activeWorkbooks[fileId];
                    }
          });

          // Also clean up export directory
          const exportDir = path.join(__dirname, '..', 'exports');
          if (fs.existsSync(exportDir)) {
                    fs.readdir(exportDir, (err, files) => {
                              if (err) {
                                        console.error('Error reading exports directory:', err);
                                        return;
                              }

                              files.forEach(file => {
                                        const filePath = path.join(exportDir, file);
                                        fs.stat(filePath, (err, stats) => {
                                                  if (err) {
                                                            console.error(`Error getting stats for ${filePath}:`, err);
                                                            return;
                                                  }

                                                  if (now - stats.mtimeMs > maxAge) {
                                                            fs.unlink(filePath, err => {
                                                                      if (err) {
                                                                                console.error(`Error deleting export file ${filePath}:`, err);
                                                                      } else {
                                                                                console.log(`Deleted old export file: ${filePath}`);
                                                                      }
                                                            });
                                                  }
                                        });
                              });
                    });
          }
};

// Run cleanup every hour
setInterval(cleanupWorkbooks, 60 * 60 * 1000);

module.exports = {
          processExcelFile,
          getSheetNames,
          getSheetData,
          updateSheetData,
          exportExcelFile,
          validateExcelFile
}; 