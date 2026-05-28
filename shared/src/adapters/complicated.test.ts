import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteRepository } from './SqliteRepository';
import type { UpsertParams } from '../types';

describe('Complicated Domain — SqliteRepository', () => {
  let repo: SqliteRepository;

  beforeEach(() => {
    // ':memory:'를 인메모리 DB로 사용하여 테스트 격리
    repo = new SqliteRepository(':memory:');
  });

  afterEach(() => {
    repo.close();
  });

  const sampleCve1: UpsertParams = {
    cveId: 'CVE-2026-0001',
    title: 'Critical Vulnerability 1',
    severity: '긴급',
    publishedAt: '2026-05-20',
    detailUrl: 'https://example.com/cve-2026-0001',
    rawSolution: 'Apply updates',
    korSummary: '',
    vendorProject: 'VendorA',
    product: 'ProductX',
    dueDate: '2026-06-20',
    description: 'RCE in ProductX',
    ransomwareUse: 'Known',
    notes: 'Urgent',
    cwes: 'CWE-78',
  };

  const sampleCve2: UpsertParams = {
    cveId: 'CVE-2026-0002',
    title: 'High Vulnerability 2',
    severity: '높음',
    publishedAt: '2026-05-21',
    detailUrl: 'https://example.com/cve-2026-0002',
    rawSolution: 'Disable feature',
    korSummary: '',
    vendorProject: 'VendorB',
    product: 'ProductY',
    dueDate: '2026-06-25',
    description: 'SQL injection',
    ransomwareUse: 'No',
    notes: 'Workaround exists',
    cwes: 'CWE-89',
  };

  it('should initialize schema and indices', () => {
    expect(repo.count()).toBe(0);
  });

  it('should insert and retrieve CVE details via upsert', () => {
    const upsertResult = repo.upsert(sampleCve1);
    expect(upsertResult.isNew).toBe(true);
    expect(repo.count()).toBe(1);

    const found = repo.findById('CVE-2026-0001');
    expect(found).toBeDefined();
    expect(found?.cve_id).toBe('CVE-2026-0001');
    expect(found?.severity).toBe('긴급');
    expect(found?.vendor_project).toBe('VendorA');
    expect(found?.ransomware_use).toBe('Known');
  });

  it('should update existing CVE details on conflict via upsert', () => {
    repo.upsert(sampleCve1);
    
    const updatedCve = {
      ...sampleCve1,
      title: 'Updated Critical Title',
      severity: '높음', // 변경
    };

    const upsertResult = repo.upsert(updatedCve);
    expect(upsertResult.isNew).toBe(false); // 기존이므로 false
    expect(repo.count()).toBe(1);

    const found = repo.findById('CVE-2026-0001');
    expect(found?.title).toBe('Updated Critical Title');
    expect(found?.severity).toBe('높음');
  });

  it('should handle batch insertion via upsertMany', () => {
    const result = repo.upsertMany([sampleCve1, sampleCve2]);
    expect(result.newCount).toBe(2);
    expect(result.updateCount).toBe(0);
    expect(repo.count()).toBe(2);

    // 다시 같은 데이터 upsertMany 실행 시 업데이트
    const result2 = repo.upsertMany([sampleCve1, sampleCve2]);
    expect(result2.newCount).toBe(0);
    expect(result2.updateCount).toBe(2);
  });

  it('should filter CVEs by severity', () => {
    repo.upsertMany([sampleCve1, sampleCve2]);

    const criticalList = repo.findBySeverity('긴급', 10);
    expect(criticalList).toHaveLength(1);
    expect(criticalList[0].cve_id).toBe('CVE-2026-0001');

    const highList = repo.findBySeverity('높음', 10);
    expect(highList).toHaveLength(1);
    expect(highList[0].cve_id).toBe('CVE-2026-0002');
  });

  it('should filter CVEs by multiple severities', () => {
    repo.upsertMany([sampleCve1, sampleCve2]);

    const list = repo.findBySeverities(['긴급', '높음'], 10);
    expect(list).toHaveLength(2);
  });

  it('should calculate statistics correctly', () => {
    repo.upsertMany([sampleCve1, sampleCve2]);

    const stats = repo.getStats();
    expect(stats.total).toBe(2);
    
    const criticalStat = stats.stats.find(s => s.severity === '긴급');
    const highStat = stats.stats.find(s => s.severity === '높음');
    
    expect(criticalStat?.count).toBe(1);
    expect(highStat?.count).toBe(1);
  });
});
