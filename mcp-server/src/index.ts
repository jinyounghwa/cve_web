import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', '..', 'crawler', 'cve.db');
const db: Database.Database = new Database(dbPath, { readonly: true });

const server = new Server(
  { name: 'cve-security-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_recent_cves',
      description: '최근 보안 취약점 목록을 가져옵니다. 프로젝트 보안 패치 적용 전 반드시 확인하세요.',
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: '조회 개수 (기본값: 10)'
          },
          severity: {
            type: 'string',
            enum: ['긴급', '높음', '보통', '낮음'],
            description: '위험도 필터'
          }
        }
      }
    },
    {
      name: 'get_cve_detail',
      description: '특정 CVE의 한국어 패치 가이드를 가져옵니다.',
      inputSchema: {
        type: 'object',
        properties: {
          cve_id: {
            type: 'string',
            description: 'CVE ID (예: CVE-2025-12345)'
          }
        },
        required: ['cve_id']
      }
    },
    {
      name: 'get_patch_context',
      description: '현재 프로젝트에 적용해야 할 모든 보안 패치 컨텍스트를 한번에 반환합니다. AI 에이전트의 자동 패치 작업에 사용하세요.',
      inputSchema: {
        type: 'object',
        properties: {
          severity_min: {
            type: 'string',
            enum: ['긴급', '높음'],
            description: '최소 위험도'
          }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_recent_cves') {
      const count = (args as any)?.count ?? 10;
      const severity = (args as any)?.severity;

      let query = 'SELECT cve_id, title, severity, published_at, kor_summary FROM cve';
      const params: any[] = [];

      if (severity) {
        query += ' WHERE severity = ?';
        params.push(severity);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(count);

      const rows = db.prepare(query).all(...params);
      return {
        content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }]
      };
    }

    if (name === 'get_cve_detail') {
      const cveId = (args as any)?.cve_id;

      if (!cveId) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'cve_id is required' }) }]
        };
      }

      const row = db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(cveId);

      if (!row) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `CVE ${cveId} not found` }) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(row, null, 2) }]
      };
    }

    if (name === 'get_patch_context') {
      const severityMin = (args as any)?.severity_min ?? '높음';
      const severities = severityMin === '긴급' ? ['긴급'] : ['긴급', '높음'];
      const placeholders = severities.map(() => '?').join(',');

      const rows = db
        .prepare(
          `SELECT cve_id, title, severity, kor_summary FROM cve
           WHERE severity IN (${placeholders})
           ORDER BY created_at DESC LIMIT 50`
        )
        .all(...severities) as any[];

      const context =
        `# 현재 적용 필요한 보안 패치 목록\n\n` +
        rows
          .map(
            (r) =>
              `## ${r.cve_id} [${r.severity}]\n**${r.title}**\n\n${r.kor_summary || '(정보 없음)'}\n`
          )
          .join('\n---\n\n');

      return {
        content: [{ type: 'text', text: context }]
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }]
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }]
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('Server connection error:', error);
  process.exit(1);
});
