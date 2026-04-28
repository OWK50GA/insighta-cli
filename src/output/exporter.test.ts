import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { saveExport } from './exporter';
import { ExportError } from '../errors';

function makeCsvResponse(body: string, contentType = 'text/csv'): Response {
  return new Response(body, {
    headers: { 'Content-Type': contentType },
  });
}

/**
 * Property 18: Export filename and absolute path are correct
 * Validates: Requirements 14.2, 14.3, 14.4
 */
test.prop([
  fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
])('Property 18: export filename matches pattern and returned path is absolute', async (csvBody) => {
  const response = makeCsvResponse(csvBody);
  const result = await saveExport(response);

  try {
    const filename = path.basename(result);
    expect(filename).toMatch(/^profiles-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    expect(path.isAbsolute(result)).toBe(true);
  } finally {
    if (fs.existsSync(result)) {
      fs.unlinkSync(result);
    }
  }
});

/**
 * Property 19: Non-CSV export response does not write a file
 * Validates: Requirements 14.2, 14.3
 */
test.prop([
  fc.oneof(
    fc.constant('application/json'),
    fc.constant('text/plain'),
    fc.constant('application/octet-stream'),
    fc.constant(''),
  ),
])('Property 19: non-CSV content type throws ExportError and writes no file', async (contentType) => {
  const body = 'some,data\n1,2';
  const response = makeCsvResponse(body, contentType);

  const filesBefore = fs.readdirSync(process.cwd()).filter(f => f.startsWith('profiles-export-'));

  await expect(saveExport(response)).rejects.toThrow(ExportError);

  const filesAfter = fs.readdirSync(process.cwd()).filter(f => f.startsWith('profiles-export-'));
  expect(filesAfter.length).toBe(filesBefore.length);
});

test('throws ExportError for empty body with valid content type', async () => {
  const response = makeCsvResponse('');
  await expect(saveExport(response)).rejects.toThrow(ExportError);
});
