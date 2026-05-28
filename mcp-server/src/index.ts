// ============================================================================
// CVE Security Agent MCP Server
// 커네빈 Complicated 영역: ICveRepository 인터페이스에만 의존
// ============================================================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import {
  createReadOnlyRepository,
  type ICveRepository,
} from 'shared';

const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', '..', 'crawler', 'cve.db');

// MCP 서버는 stdio 수명과 동일하게 Repository 유지
const repo: ICveRepository = createReadOnlyRepository(dbPath);

const server = new Server(
  { name: 'cve-security-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_recent_cves',
      description: '최근 보안 취약점 목록을 가져옵니다. 프로젝트 보안 패치 적용 전 반드시 확인하세요. AI가 이 정보를 분석하여 패치 가이드를 생성합니다.',
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

      const rows = severity
        ? repo.findBySeverity(severity, count)
        : repo.findAll(count);

      // MCP 응답에 필요한 필드만 추출
      const filtered = rows.map(r => ({
        cve_id: r.cve_id,
        title: r.title,
        severity: r.severity,
        published_at: r.published_at,
        detail_url: r.detail_url,
        raw_solution: r.raw_solution,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }]
      };
    }

    if (name === 'get_cve_detail') {
      const cveId = (args as any)?.cve_id;

      if (!cveId) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'cve_id is required' }) }]
        };
      }

      const row = repo.findById(cveId);

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

      const rows = repo.findBySeverities(severities, 50);

      const context =
        `# 프로젝트 보안 패치 필요 목록\n\n` +
        `**주의**: 아래 정보를 분석하여 각 CVE에 대한 구체적인 패치 가이드를 생성하고 프로젝트에 적용해주세요.\n\n` +
        rows
          .map(
            (r) =>
              `## ${r.cve_id} [${r.severity}]\n` +
              `**${r.title}**\n\n` +
              `- 발행일: ${r.published_at}\n` +
              `- 상세정보: ${r.detail_url}\n` +
              `- 원문 해결책: ${r.raw_solution || '(정보 없음)'}\n`
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
