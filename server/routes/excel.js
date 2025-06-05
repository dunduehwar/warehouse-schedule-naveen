const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const excelService = require('../services/excelService');

// Ensure upload and export directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const exportDir = path.join(__dirname, '..', 'exports');

if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
          destination: function (req, file, cb) {
                    cb(null, uploadDir);
          },
          filename: function (req, file, cb) {
                    // Use timestamp to avoid filename conflicts
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, uniqueSuffix + '-' + file.originalname);
          }
});

// File filter to only allow Excel files
const fileFilter = (req, file, cb) => {
          // Accept excel files and other spreadsheet formats
          const filetypes = /xlsx|xls|csv|ods|tsv|txt|xlsm|xlsb|xltx|xltm|xlam/;
          const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
          const mimetype =
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // xlsx
                    file.mimetype === 'application/vnd.ms-excel' || // xls
                    file.mimetype === 'text/csv' || // csv
                    file.mimetype === 'application/vnd.oasis.opendocument.spreadsheet' || // ods
                    file.mimetype === 'text/tab-separated-values' || // tsv
                    file.mimetype === 'text/plain' || // txt
                    file.mimetype === 'application/vnd.ms-excel.sheet.macroEnabled.12' || // xlsm
                    file.mimetype === 'application/vnd.ms-excel.sheet.binary.macroEnabled.12' || // xlsb
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.template' || // xltx
                    file.mimetype === 'application/vnd.ms-excel.template.macroEnabled.12' || // xltm
                    file.mimetype === 'application/vnd.ms-excel.addin.macroEnabled.12'; // xlam

          if (mimetype || extname) {
                    return cb(null, true);
          }

          return cb(new Error('Only spreadsheet files (.xlsx, .xls, .csv, .ods, .tsv, etc.) are allowed!'), false);
};

// Configure multer with file size limit (10MB)
const upload = multer({
          storage: storage,
          fileFilter: fileFilter,
          limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// POST /api/upload - Upload Excel file
router.post('/upload', upload.single('file'), (req, res, next) => {
          if (!req.file) {
                    return res.status(400).json({
                              success: false,
                              message: 'No file uploaded or invalid file format. Only spreadsheet files (.xlsx, .xls, .csv, .ods, .tsv, etc.) are allowed.'
                    });
          }

          try {
                    const result = excelService.processExcelFile(req.file);
                    res.json(result);
          } catch (error) {
                    console.error('Excel upload error:', error);

                    // Delete the uploaded file if processing failed
                    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                              try {
                                        fs.unlinkSync(req.file.path);
                              } catch (unlinkError) {
                                        console.error('Failed to delete uploaded file:', unlinkError);
                              }
                    }

                    return res.status(400).json({
                              success: false,
                              message: error.message || 'Failed to process Excel file'
                    });
          }
});

// GET /api/sheets/:fileId - Get sheet names
router.get('/sheets/:fileId', (req, res, next) => {
          try {
                    const { fileId } = req.params;
                    const sheetNames = excelService.getSheetNames(fileId);
                    res.json({
                              success: true,
                              sheetNames
                    });
          } catch (error) {
                    if (error.message === 'File not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'File not found or has been deleted due to inactivity'
                              });
                    }
                    next(error);
          }
});

// GET /api/data/:fileId/:sheetName - Get sheet data
router.get('/data/:fileId/:sheetName', (req, res, next) => {
          try {
                    const { fileId, sheetName } = req.params;
                    const page = parseInt(req.query.page) || null;
                    const pageSize = parseInt(req.query.pageSize) || null;

                    const result = excelService.getSheetData(fileId, sheetName, { page, pageSize });
                    res.json({
                              success: true,
                              data: result.data,
                              metadata: {
                                        totalRows: result.totalRows,
                                        totalColumns: result.totalColumns,
                                        page,
                                        pageSize
                              }
                    });
          } catch (error) {
                    if (error.message === 'File not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'File not found or has been deleted due to inactivity'
                              });
                    }
                    if (error.message === 'Sheet not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'Sheet not found in the Excel file'
                              });
                    }
                    next(error);
          }
});

// PUT /api/data/:fileId/:sheetName - Update sheet data
router.put('/data/:fileId/:sheetName', (req, res, next) => {
          try {
                    const { fileId, sheetName } = req.params;
                    const { data } = req.body;

                    if (!Array.isArray(data)) {
                              return res.status(400).json({
                                        success: false,
                                        message: 'Data must be an array'
                              });
                    }

                    excelService.updateSheetData(fileId, sheetName, data);
                    res.json({
                              success: true,
                              message: 'Data updated successfully'
                    });
          } catch (error) {
                    if (error.message === 'File not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'File not found or has been deleted due to inactivity'
                              });
                    }
                    if (error.message === 'Sheet not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'Sheet not found in the Excel file'
                              });
                    }
                    next(error);
          }
});

// POST /api/export/:fileId - Export Excel file
router.post('/export/:fileId', (req, res, next) => {
          try {
                    const { fileId } = req.params;
                    const exportInfo = excelService.exportExcelFile(fileId);

                    // Return download URL
                    const downloadUrl = `/exports/${path.basename(exportInfo.filePath)}`;
                    res.json({
                              success: true,
                              downloadUrl,
                              fileName: exportInfo.originalName
                    });
          } catch (error) {
                    if (error.message === 'File not found') {
                              return res.status(404).json({
                                        success: false,
                                        message: 'File not found or has been deleted due to inactivity'
                              });
                    }
                    next(error);
          }
});

module.exports = router; 