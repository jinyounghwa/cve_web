import { describe, it, expect } from 'vitest';
import { calcSeverity } from './severity';
import { parseCsv } from './csv-parser';

describe('Clear Domain — Severity Calculation (calcSeverity)', () => {
  it('should return 긴급 (Urgent) when ransomware is Known and date is overdue', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateAdded = '2026-01-01';
    expect(calcSeverity(yesterday, dateAdded, 'Known')).toBe('긴급');
  });

  it('should return 높음 (High) when ransomware is Known but not overdue', () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10000).toISOString().split('T')[0];
    const dateAdded = '2026-05-01';
    expect(calcSeverity(nextWeek, dateAdded, 'Known')).toBe('높음');
  });

  it('should return 높음 (High) when overdue but ransomware is not Known', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateAdded = '2026-05-01';
    expect(calcSeverity(yesterday, dateAdded, 'No')).toBe('높음');
  });

  it('should return 보통 (Medium) when due date is within 7 days', () => {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateAdded = '2026-05-01';
    expect(calcSeverity(in3Days, dateAdded, 'No')).toBe('보통');
  });

  it('should return 보통 (Medium) when recently added within 30 days', () => {
    const nextMonth = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calcSeverity(nextMonth, tenDaysAgo, 'No')).toBe('보통');
  });

  it('should return 낮음 (Low) as a default fallback', () => {
    const nextMonth = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calcSeverity(nextMonth, twoMonthsAgo, 'No')).toBe('낮음');
  });
});

describe('Clear Domain — CSV Parsing (parseCsv)', () => {
  it('should parse valid CSV text correctly', () => {
    const csv = `cveID,vendorProject,product,vulnerabilityName,dateAdded,shortDescription,requiredAction,dueDate,knownRansomwareCampaignUse,notes,cwes
CVE-2026-1234,VendorA,ProductX,RCE in ProductX,2026-05-20,A critical vulnerability,Apply updates immediately,2026-06-20,Known,http://notes,CWE-78`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      cveID: 'CVE-2026-1234',
      vendorProject: 'VendorA',
      product: 'ProductX',
      vulnerabilityName: 'RCE in ProductX',
      dateAdded: '2026-05-20',
      shortDescription: 'A critical vulnerability',
      requiredAction: 'Apply updates immediately',
      dueDate: '2026-06-20',
      knownRansomwareCampaignUse: 'Known',
      notes: 'http://notes',
      cwes: 'CWE-78',
    });
  });

  it('should correctly handle quoted fields containing commas', () => {
    const csv = `cveID,vendorProject,product,vulnerabilityName,dateAdded,shortDescription,requiredAction,dueDate,knownRansomwareCampaignUse,notes,cwes
CVE-2026-9999,"Vendor, Inc.",ProductY,SQL Injection,2026-05-25,"Description, with commas",Apply patch,2026-06-25,No,http://notes,CWE-89`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].vendorProject).toBe('Vendor, Inc.');
    expect(result[0].shortDescription).toBe('Description, with commas');
  });

  it('should filter out invalid rows (non CVE)', () => {
    const csv = `cveID,vendorProject,product,vulnerabilityName,dateAdded,shortDescription,requiredAction,dueDate,knownRansomwareCampaignUse,notes,cwes
INVALID-ID,VendorA,ProductX,Vulnerability,2026-05-20,Desc,Action,2026-06-20,No,,`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty CSV', () => {
    expect(parseCsv('')).toHaveLength(0);
  });
});
