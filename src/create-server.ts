import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListRepositoriesTool } from "./tools/list-repositories.js";
import { registerListIssuesTool } from "./tools/list-issues.js";
import { registerCreateIssueTool } from "./tools/create-issue.js";
import { registerCreateRepositoryTool } from "./tools/create-repository.js";
import { registerCreateCommitTool } from "./tools/create-commit.js";

// Separar la construcción del arranque permite probar MCP sin abrir procesos externos.
export function createServer() {
    const server = new McpServer({ name: "github-mcp-server", version: "1.0.0" });
    registerListRepositoriesTool(server);
    registerListIssuesTool(server);
    registerCreateIssueTool(server);
    registerCreateRepositoryTool(server);
    registerCreateCommitTool(server);
    return server;
}
