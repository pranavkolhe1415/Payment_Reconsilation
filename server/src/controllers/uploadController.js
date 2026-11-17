import crypto from 'crypto';
import { parseCSVContent } from '../services/csvParserService.js';
import { 
  validatePlatformHeaders, 
  validateBankHeaders, 
  validatePlatformRecord, 
  validateBankRecord 
} from '../services/validationService.js';

// Global cache for staged uploads before reconciliation
export const stagedFilesStore = {
  platform: null,
  bank: null
};

export const uploadPlatform = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV file with field name "file".'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsed = parseCSVContent(csvContent);

    // Validate headers
    const headerCheck = validatePlatformHeaders(parsed.headers);
    if (!headerCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: `Platform CSV missing required headers: ${headerCheck.missing.join(', ')}`,
        required_headers: ['transaction_id', 'transaction_date', 'transaction_type', 'amount', 'currency']
      });
    }

    // Row-level validation
    const validRecords = [];
    const invalidRecords = [];

    parsed.records.forEach((row) => {
      const val = validatePlatformRecord(row);
      if (val.isValid) {
        validRecords.push(row);
      } else {
        invalidRecords.push({ row_number: row._row_number, errors: val.errors });
      }
    });

    const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');

    stagedFilesStore.platform = {
      filename: req.file.originalname,
      content: csvContent,
      fileHash,
      total_records: parsed.records.length,
      valid_records: validRecords.length,
      invalid_records: invalidRecords.length
    };

    res.status(200).json({
      success: true,
      message: 'Platform CSV uploaded and validated successfully',
      data: {
        filename: req.file.originalname,
        file_hash: fileHash,
        total_records: parsed.records.length,
        valid_records: validRecords.length,
        invalid_records: invalidRecords.length,
        invalid_sample: invalidRecords.slice(0, 5),
        sample: validRecords.slice(0, 3)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const uploadBank = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV file with field name "file".'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsed = parseCSVContent(csvContent);

    // Validate headers
    const headerCheck = validateBankHeaders(parsed.headers);
    if (!headerCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: `Bank CSV missing required headers: ${headerCheck.missing.join(', ')}`,
        required_headers: ['settlement_id', 'transaction_reference', 'settlement_date', 'transaction_type', 'settlement_amount', 'currency']
      });
    }

    // Row-level validation
    const validRecords = [];
    const invalidRecords = [];

    parsed.records.forEach((row) => {
      const val = validateBankRecord(row);
      if (val.isValid) {
        validRecords.push(row);
      } else {
        invalidRecords.push({ row_number: row._row_number, errors: val.errors });
      }
    });

    const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');

    stagedFilesStore.bank = {
      filename: req.file.originalname,
      content: csvContent,
      fileHash,
      total_records: parsed.records.length,
      valid_records: validRecords.length,
      invalid_records: invalidRecords.length
    };

    res.status(200).json({
      success: true,
      message: 'Bank settlements CSV uploaded and validated successfully',
      data: {
        filename: req.file.originalname,
        file_hash: fileHash,
        total_records: parsed.records.length,
        valid_records: validRecords.length,
        invalid_records: invalidRecords.length,
        invalid_sample: invalidRecords.slice(0, 5),
        sample: validRecords.slice(0, 3)
      }
    });
  } catch (err) {
    next(err);
  }
};
