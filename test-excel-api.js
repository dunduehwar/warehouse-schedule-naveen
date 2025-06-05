const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:3000'; // Change this if your server runs on a different port

// Global variables to store data between tests
let fileId;
let sheetNames = [];
let sheetData = [];
let downloadUrl;

/**
 * Test file upload
 */
async function testFileUpload() {
          console.log('\n=== Testing File Upload ===');

          try {
                    // Create a form with the Excel file
                    const form = new FormData();
                    const filePath = path.join(__dirname, 'test-data.xlsx');

                    // Check if test file exists
                    if (!fs.existsSync(filePath)) {
                              console.error('Test file not found. Please create a test-data.xlsx file in the same directory as this script.');
                              return false;
                    }

                    form.append('file', fs.createReadStream(filePath));

                    // Make the request
                    const response = await axios.post(`${API_URL}/excel/upload`, form, {
                              headers: {
                                        ...form.getHeaders()
                              }
                    });

                    console.log('Response:', response.data);

                    if (response.data.success && response.data.fileId) {
                              fileId = response.data.fileId;
                              console.log(`✅ File uploaded successfully. FileId: ${fileId}`);
                              return true;
                    } else {
                              console.error('❌ File upload failed:', response.data.message || 'Unknown error');
                              return false;
                    }
          } catch (error) {
                    console.error('❌ Error uploading file:', error.response?.data?.message || error.message);
                    return false;
          }
}

/**
 * Test getting sheet names
 */
async function testGetSheetNames() {
          console.log('\n=== Testing Get Sheet Names ===');

          try {
                    const response = await axios.get(`${API_URL}/excel/sheets/${fileId}`);
                    console.log('Response:', response.data);

                    if (response.data.success && Array.isArray(response.data.sheetNames)) {
                              sheetNames = response.data.sheetNames;
                              console.log(`✅ Got ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
                              return true;
                    } else {
                              console.error('❌ Failed to get sheet names:', response.data.message || 'Unknown error');
                              return false;
                    }
          } catch (error) {
                    console.error('❌ Error getting sheet names:', error.response?.data?.message || error.message);
                    return false;
          }
}

/**
 * Test getting sheet data
 */
async function testGetSheetData() {
          if (sheetNames.length === 0) {
                    console.error('❌ No sheet names available to test');
                    return false;
          }

          const sheetName = sheetNames[0];
          console.log(`\n=== Testing Get Sheet Data for "${sheetName}" ===`);

          try {
                    const response = await axios.get(`${API_URL}/excel/data/${fileId}/${sheetName}`);
                    console.log('Response:', response.data);

                    if (response.data.success && Array.isArray(response.data.data)) {
                              sheetData = response.data.data;
                              console.log(`✅ Got data with ${sheetData.length} rows`);
                              return true;
                    } else {
                              console.error('❌ Failed to get sheet data:', response.data.message || 'Unknown error');
                              return false;
                    }
          } catch (error) {
                    console.error('❌ Error getting sheet data:', error.response?.data?.message || error.message);
                    return false;
          }
}

/**
 * Test updating sheet data
 */
async function testUpdateSheetData() {
          if (sheetNames.length === 0 || !sheetData || sheetData.length === 0) {
                    console.error('❌ No sheet data available to test update');
                    return false;
          }

          const sheetName = sheetNames[0];
          console.log(`\n=== Testing Update Sheet Data for "${sheetName}" ===`);

          // Modify the first cell of the first row (if it exists)
          if (sheetData[0] && sheetData[0].length > 0) {
                    sheetData[0][0] = 'Updated by Test Script';
          } else {
                    // Add a new row if data is empty
                    sheetData.push(['Updated by Test Script', 'Test Value']);
          }

          try {
                    const response = await axios.put(`${API_URL}/excel/data/${fileId}/${sheetName}`, {
                              data: sheetData
                    });
                    console.log('Response:', response.data);

                    if (response.data.success) {
                              console.log('✅ Sheet data updated successfully');
                              return true;
                    } else {
                              console.error('❌ Failed to update sheet data:', response.data.message || 'Unknown error');
                              return false;
                    }
          } catch (error) {
                    console.error('❌ Error updating sheet data:', error.response?.data?.message || error.message);
                    return false;
          }
}

/**
 * Test exporting Excel file
 */
async function testExportFile() {
          console.log('\n=== Testing Export Excel File ===');

          try {
                    const response = await axios.post(`${API_URL}/excel/export/${fileId}`);
                    console.log('Response:', response.data);

                    if (response.data.success && response.data.downloadUrl) {
                              downloadUrl = response.data.downloadUrl;
                              console.log(`✅ File exported successfully. Download URL: ${API_URL}${downloadUrl}`);
                              return true;
                    } else {
                              console.error('❌ Failed to export file:', response.data.message || 'Unknown error');
                              return false;
                    }
          } catch (error) {
                    console.error('❌ Error exporting file:', error.response?.data?.message || error.message);
                    return false;
          }
}

/**
 * Test downloading exported file
 */
async function testDownloadExportedFile() {
          if (!downloadUrl) {
                    console.error('❌ No download URL available to test');
                    return false;
          }

          console.log('\n=== Testing Download Exported File ===');

          try {
                    const response = await axios.get(`${API_URL}${downloadUrl}`, {
                              responseType: 'arraybuffer'
                    });

                    // Save the file locally
                    const outputPath = path.join(__dirname, 'exported-test-data.xlsx');
                    fs.writeFileSync(outputPath, response.data);

                    console.log(`✅ File downloaded successfully and saved to ${outputPath}`);
                    return true;
          } catch (error) {
                    console.error('❌ Error downloading file:', error.message);
                    return false;
          }
}

/**
 * Run all tests in sequence
 */
async function runTests() {
          console.log('=== Starting Excel API Tests ===');

          // Upload file
          const uploadSuccess = await testFileUpload();
          if (!uploadSuccess) {
                    console.error('❌ File upload test failed. Stopping tests.');
                    return;
          }

          // Get sheet names
          const sheetNamesSuccess = await testGetSheetNames();
          if (!sheetNamesSuccess) {
                    console.error('❌ Get sheet names test failed. Stopping tests.');
                    return;
          }

          // Get sheet data
          const sheetDataSuccess = await testGetSheetData();
          if (!sheetDataSuccess) {
                    console.error('❌ Get sheet data test failed. Stopping tests.');
                    return;
          }

          // Update sheet data
          const updateSuccess = await testUpdateSheetData();
          if (!updateSuccess) {
                    console.error('❌ Update sheet data test failed. Stopping tests.');
                    return;
          }

          // Export file
          const exportSuccess = await testExportFile();
          if (!exportSuccess) {
                    console.error('❌ Export file test failed. Stopping tests.');
                    return;
          }

          // Download exported file
          await testDownloadExportedFile();

          console.log('\n=== All Tests Completed ===');
}

// Run the tests
runTests().catch(error => {
          console.error('Unhandled error during tests:', error);
}); 