import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface CveItem {
  id: string;
  title: string;
  severity: string;
  rawSolution: string;
}

export async function summarizeWithClaude(item: CveItem): Promise<string> {
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `다음 CVE 보안 취약점 정보를 한국어로 요약해줘.
개발자가 바로 패치 적용할 수 있도록 핵심만 3~5줄로 정리.

CVE ID: ${item.id}
제목: ${item.title}
위험도: ${item.severity}
해결책(영문): ${item.rawSolution.substring(0, 500)}

출력 형식:
- 영향 범위: (어떤 소프트웨어/버전)
- 취약점 유형: (XSS/SQLi/RCE 등)
- 해결 방법: (버전 업그레이드, 설정 변경 등 구체적 조치)
- 우선순위: (즉시/이번 주 내/다음 배포 시)`
      }]
    });

    const textContent = msg.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }
    return 'Failed to summarize';
  } catch (error) {
    console.error('Claude summarization error:', error);
    return `CVE ${item.id}: ${item.title} (${item.severity}) - 해결책: ${item.rawSolution.substring(0, 100)}`;
  }
}
