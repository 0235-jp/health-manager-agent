/**
 * Tool system interfaces for agent plugins
 */

/**
 * Tool parameter property definition (JSON Schema compatible)
 */
export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  items?: { type: string };
  enum?: string[];
}

/**
 * Tool definition - describes a tool that agent plugins can use
 */
export interface ToolDefinition {
  /** Unique tool identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Parameter schema (JSON Schema format) */
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterProperty>;
    required: string[];
  };
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (
  args: Record<string, unknown>
) => ToolResult | Promise<ToolResult>;

/**
 * Registered tool with definition and handler
 */
export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * Tool executor interface - executes tools on behalf of agent plugins
 */
export interface ToolExecutor {
  /**
   * Get all available tool definitions
   */
  getTools(): ToolDefinition[];

  /**
   * Execute a tool by name with given arguments
   */
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Check if a specific tool is available
   */
  hasTool(name: string): boolean;
}
