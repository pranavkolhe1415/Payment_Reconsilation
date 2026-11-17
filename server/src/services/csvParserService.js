import { parse } from 'csv-parse/sync';

/**
 * Parses raw CSV content and attaches the exact 1-indexed source row number.
 * Header is row 1, first data record is row 2.
 */
export const parseCSVContent = (content, options = {}) => {
  if (!content) {
    throw new Error('CSV content is empty or null');
  }

  const rawText = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

  let headers = [];
  const records = parse(rawText, {
    columns: (headerRow) => {
      headers = headerRow.map((h) => h.trim());
      return headers;
    },
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    on_record: (record, context) => {
      return {
        ...record,
        _row_number: context.lines
      };
    },
    ...options
  });

  return {
    headers,
    records,
    total_records: records.length
  };
};
