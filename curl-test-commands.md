# Testing Excel API with curl commands

Below are curl commands to test each endpoint of the Excel API. Make sure your server is running before executing these commands.

## Prerequisites

1. Create a test Excel file named `test-data.xlsx` in your project directory
2. Make sure your server is running (typically on port 3000)

## 1. Upload Excel File

```bash
curl -X POST \
  http://localhost:3000/excel/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./test-data.xlsx"
```

This will return a JSON response with a `fileId`. Save this ID for use in the following commands.

## 2. Get Sheet Names

Replace `{fileId}` with the ID returned from the upload command:

```bash
curl -X GET http://localhost:3000/excel/sheets/{fileId}
```

This will return a list of sheet names in the Excel file.

## 3. Get Sheet Data

Replace `{fileId}` with the file ID and `{sheetName}` with one of the sheet names:

```bash
curl -X GET http://localhost:3000/excel/data/{fileId}/{sheetName}
```

This will return the data from the specified sheet.

## 4. Update Sheet Data

Replace `{fileId}` with the file ID, `{sheetName}` with the sheet name, and provide the updated data:

```bash
curl -X PUT \
  http://localhost:3000/excel/data/{fileId}/{sheetName} \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      ["Updated Header", "Column B"],
      ["Row 1 Cell A", "Row 1 Cell B"],
      ["Row 2 Cell A", "Row 2 Cell B"]
    ]
  }'
```

## 5. Export Excel File

Replace `{fileId}` with the file ID:

```bash
curl -X POST http://localhost:3000/excel/export/{fileId}
```

This will return a download URL for the exported file.

## 6. Download Exported File

Replace `{downloadUrl}` with the URL returned from the export command:

```bash
curl -X GET http://localhost:3000{downloadUrl} --output exported-file.xlsx
```

This will download the exported Excel file to your local machine.

## Testing Invalid Scenarios

### Test Invalid File Upload (non-Excel file)

```bash
curl -X POST \
  http://localhost:3000/excel/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./some-text-file.txt"
```

### Test Non-existent File ID

```bash
curl -X GET http://localhost:3000/excel/sheets/invalid-file-id
```

### Test Non-existent Sheet Name

Replace `{fileId}` with a valid file ID:

```bash
curl -X GET http://localhost:3000/excel/data/{fileId}/non-existent-sheet
```
