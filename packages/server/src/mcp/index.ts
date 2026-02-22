import { randomUUID } from 'node:crypto';
import type { Application, Request, Response } from 'express';
import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { healthDataRepository } from '../db/repositories/health-data.js';
import { reportsRepository } from '../db/repositories/reports.js';
import { healthDataTimeseriesRepository } from '../db/repositories/health-data-timeseries.js';
import { dataTypesRepository, formatDataTypeRecord } from '../db/repositories/data-types.js';
import { customDataTypesRepository } from '../db/repositories/custom-data-types.js';

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const transports: Record<string, StreamableHTTPServerTransport> = {};

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'health-manager', version: '1.0.0' },
    { capabilities: { logging: {} } },
  );

  // -----------------------------------------------------------------------
  // Tools
  // -----------------------------------------------------------------------

  server.registerTool('query_health_data', {
    description: 'Search health data with filters (data type, source, date range) and pagination',
    inputSchema: {
      data_type: z.string().optional().describe('Filter by data type (e.g. "steps", "heart_rate")'),
      source: z.string().optional().describe('Filter by data source'),
      start_date: z.string().optional().describe('Start date (ISO 8601)'),
      end_date: z.string().optional().describe('End date (ISO 8601)'),
      limit: z.number().int().positive().max(1000).optional().default(100).describe('Max results'),
      offset: z.number().int().nonnegative().optional().default(0).describe('Offset for pagination'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataRepository.findAll({
      data_type: args.data_type,
      source: args.source,
      start_date: args.start_date,
      end_date: args.end_date,
      limit: args.limit,
      offset: args.offset,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('get_latest_health_data', {
    description: 'Get the latest value for specified data types',
    inputSchema: {
      data_types: z.array(z.string()).min(1).describe('Data types to retrieve (e.g. ["steps","heart_rate"])'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataRepository.getLatest(args.data_types);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('get_health_data_range', {
    description: 'Get health data within a date range for specified data types',
    inputSchema: {
      data_types: z.array(z.string()).min(1).describe('Data types'),
      start_date: z.string().describe('Start date (ISO 8601)'),
      end_date: z.string().describe('End date (ISO 8601)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataRepository.getRange(args.data_types, args.start_date, args.end_date);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('aggregate_health_data', {
    description: 'Compute aggregate statistics (min, max, avg, count) for health data',
    inputSchema: {
      data_types: z.array(z.string()).min(1).describe('Data types'),
      start_date: z.string().describe('Start date (ISO 8601)'),
      end_date: z.string().describe('End date (ISO 8601)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataRepository.aggregate(args.data_types, args.start_date, args.end_date);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('analyze_health_trend', {
    description: 'Analyze trend (up/down/stable) for health data in a date range',
    inputSchema: {
      data_types: z.array(z.string()).min(1).describe('Data types'),
      start_date: z.string().describe('Start date (ISO 8601)'),
      end_date: z.string().describe('End date (ISO 8601)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataRepository.analyzeTrend(args.data_types, args.start_date, args.end_date);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('query_reports', {
    description: 'Search health reports with optional type and date filters',
    inputSchema: {
      report_type: z.enum(['on_fetch', 'daily', 'manual']).optional().describe('Filter by report type'),
      start_date: z.string().optional().describe('Start date (ISO 8601)'),
      end_date: z.string().optional().describe('End date (ISO 8601)'),
      limit: z.number().int().positive().max(100).optional().default(20).describe('Max results'),
      offset: z.number().int().nonnegative().optional().default(0).describe('Offset'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = reportsRepository.findAll({
      report_type: args.report_type,
      start_date: args.start_date,
      end_date: args.end_date,
      limit: args.limit,
      offset: args.offset,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('get_report', {
    description: 'Get a specific report by ID',
    inputSchema: {
      id: z.number().int().positive().describe('Report ID'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = reportsRepository.findById(args.id);
    if (!result) {
      return { content: [{ type: 'text', text: `Report with ID ${args.id} not found` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('get_latest_report', {
    description: 'Get the most recent report, optionally filtered by type',
    inputSchema: {
      report_type: z.enum(['on_fetch', 'daily', 'manual']).optional().describe('Filter by report type'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = reportsRepository.findLatest(args.report_type);
    if (!result) {
      return { content: [{ type: 'text', text: 'No report found' }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('query_timeseries', {
    description: 'Search timeseries health data with filters and pagination',
    inputSchema: {
      data_type: z.string().optional().describe('Filter by data type'),
      source: z.string().optional().describe('Filter by source'),
      start_time: z.string().optional().describe('Start time (ISO 8601)'),
      end_time: z.string().optional().describe('End time (ISO 8601)'),
      period_date: z.string().optional().describe('Filter by period date (YYYY-MM-DD)'),
      limit: z.number().int().positive().max(1000).optional().default(100).describe('Max results'),
      offset: z.number().int().nonnegative().optional().default(0).describe('Offset'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataTimeseriesRepository.findAll({
      data_type: args.data_type,
      source: args.source,
      start_time: args.start_time,
      end_time: args.end_time,
      period_date: args.period_date,
      limit: args.limit,
      offset: args.offset,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  server.registerTool('aggregate_timeseries', {
    description: 'Compute aggregate statistics for timeseries data',
    inputSchema: {
      data_type: z.string().describe('Data type to aggregate'),
      start_time: z.string().describe('Start time (ISO 8601)'),
      end_time: z.string().describe('End time (ISO 8601)'),
      source: z.string().optional().describe('Filter by source'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (args) => {
    const result = healthDataTimeseriesRepository.aggregate(
      args.data_type,
      args.start_time,
      args.end_time,
      args.source,
    );
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  // -----------------------------------------------------------------------
  // Resources
  // -----------------------------------------------------------------------

  server.registerResource('data-types-catalog', 'health://data-types/catalog', {
    description: 'List of all available health data types',
    mimeType: 'application/json',
  }, async () => {
    const records = dataTypesRepository.findAllWithPluginTypes();
    const formatted = records.map(formatDataTypeRecord);
    return {
      contents: [{
        uri: 'health://data-types/catalog',
        text: JSON.stringify(formatted),
        mimeType: 'application/json',
      }],
    };
  });

  server.registerResource('custom-data-types', 'health://custom-data-types/active', {
    description: 'List of active custom data types',
    mimeType: 'application/json',
  }, async () => {
    const records = customDataTypesRepository.findActive();
    return {
      contents: [{
        uri: 'health://custom-data-types/active',
        text: JSON.stringify(records),
        mimeType: 'application/json',
      }],
    };
  });

  server.registerResource('timeseries-data-types', 'health://timeseries/data-types', {
    description: 'Data types available in timeseries data',
    mimeType: 'application/json',
  }, async () => {
    const types = healthDataTimeseriesRepository.getDataTypes();
    return {
      contents: [{
        uri: 'health://timeseries/data-types',
        text: JSON.stringify(types),
        mimeType: 'application/json',
      }],
    };
  });

  return server;
}

// ---------------------------------------------------------------------------
// Express integration
// ---------------------------------------------------------------------------

export function mountMcp(app: Application): void {
  // POST /mcp — initialize new session or handle MCP requests
  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) delete transports[sid];
        };

        const server = createMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
    } catch (error) {
      console.error('MCP POST error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp — SSE stream for server→client notifications
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // DELETE /mcp — session termination
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function closeMcpSessions(): Promise<void> {
  const sessions = Object.keys(transports);
  for (const sessionId of sessions) {
    try {
      await transports[sessionId].close();
    } catch {
      // Ignore close errors during shutdown
    }
    delete transports[sessionId];
  }
}
