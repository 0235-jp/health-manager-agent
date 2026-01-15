/**
 * Default Tool Executor - executes tools registered in the registry
 */

import type {
  ToolDefinition,
  ToolResult,
  ToolExecutor,
} from './interfaces.js';
import { ToolRegistry } from './registry.js';

// Import built-in tools
import {
  getDataTypesTool,
  executeGetDataTypes,
} from './builtin/get-data-types.js';
import {
  getHealthDataTool,
  executeGetHealthData,
} from './builtin/get-health-data.js';
import {
  getHealthDataLatestTool,
  executeGetHealthDataLatest,
} from './builtin/get-health-data-latest.js';
import {
  getHealthDataTrendTool,
  executeGetHealthDataTrend,
} from './builtin/get-health-data-trend.js';
import {
  getHealthDataTimeseriesTool,
  executeGetHealthDataTimeseries,
} from './builtin/get-health-data-timeseries.js';

export class DefaultToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;

  constructor() {
    this.registry = new ToolRegistry();
    this.registerBuiltinTools();
  }

  /**
   * Register all built-in tools
   */
  private registerBuiltinTools(): void {
    this.registry.register(getDataTypesTool, executeGetDataTypes);
    this.registry.register(getHealthDataTool, executeGetHealthData);
    this.registry.register(getHealthDataLatestTool, executeGetHealthDataLatest);
    this.registry.register(getHealthDataTrendTool, executeGetHealthDataTrend);
    this.registry.register(getHealthDataTimeseriesTool, executeGetHealthDataTimeseries);

    console.log(
      `[ToolExecutor] Registered ${this.registry.size} built-in tools`
    );
  }

  /**
   * Get all available tool definitions
   */
  getTools(): ToolDefinition[] {
    return this.registry.getDefinitions();
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.registry.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      const result = await tool.handler(args);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a specific tool is available
   */
  hasTool(name: string): boolean {
    return this.registry.has(name);
  }
}
