import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod/v4';
import { healthDataRepository } from '../../db/repositories/health-data.js';

const GetHealthDataInputSchema = {
  query_type: z.enum(['latest', 'range', 'aggregate', 'trend']).describe(
    '\u30af\u30a8\u30ea\u30bf\u30a4\u30d7: latest=\u6700\u65b0\u5024, range=\u671f\u9593\u6307\u5b9a, aggregate=\u96c6\u8a08, trend=\u30c8\u30ec\u30f3\u30c9'
  ),
  data_types: z.array(z.string()).describe(
    '\u53d6\u5f97\u3059\u308b\u30c7\u30fc\u30bf\u30bf\u30a4\u30d7\uff08\u4f8b: weight, sleep_duration, steps\uff09'
  ),
  start_date: z.string().optional().describe('\u958b\u59cb\u65e5\uff08YYYY-MM-DD\uff09'),
  end_date: z.string().optional().describe('\u7d42\u4e86\u65e5\uff08YYYY-MM-DD\uff09'),
};

export const getHealthDataSkill = tool(
  'get_health_data',
  '\u4fdd\u5b58\u3055\u308c\u3066\u3044\u308b\u30d8\u30eb\u30b9\u30c7\u30fc\u30bf\u3092\u7167\u4f1a\u3057\u307e\u3059\u3002\u6700\u65b0\u306e\u30c7\u30fc\u30bf\u3001\u671f\u9593\u6307\u5b9a\u3001\u96c6\u8a08\u3001\u30c8\u30ec\u30f3\u30c9\u5206\u6790\u304c\u53ef\u80fd\u3067\u3059\u3002',
  GetHealthDataInputSchema,
  async (params) => {
    const { query_type, data_types, start_date, end_date } = params;

    const startDateStr = start_date ?? getDefaultStartDate();
    const endDateStr = end_date ?? getDefaultEndDate();

    let result: unknown;

    switch (query_type) {
      case 'latest':
        result = healthDataRepository.getLatest(data_types);
        break;
      case 'range':
        result = healthDataRepository.getRange(data_types, startDateStr, endDateStr);
        break;
      case 'aggregate':
        result = healthDataRepository.aggregate(data_types, startDateStr, endDateStr);
        break;
      case 'trend':
        result = healthDataRepository.analyzeTrend(data_types, startDateStr, endDateStr);
        break;
      default:
        throw new Error(`Unknown query type: ${query_type}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}
