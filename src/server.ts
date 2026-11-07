import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListRepositoriesTool } from "./tools/list-repositories.js";
import { registerListIssuesTool } from "./tools/list-issues.js";
import { registerCreateIssueTool } from "./tools/create-issue.js";
import { registerCreateRepositoryTool } from "./tools/create-repository.js";
import { registerCreateCommitTool } from "./tools/create-commit.js";
import { z } from "zod";

const server = new McpServer({
    name: "github-mcp-server",
    version: "1.0.0",
});

server.registerTool(
    "saludar",
    {
        description: "Devuelve un saludo personalizado para comprobar la conexión.",
        inputSchema: {
            nombre: z
                .string()
                .trim()
                .min(1, "El nombre no puede estar vacío")
                .describe("Nombre de la persona a saludar"),
        },
    },
    async ({ nombre }) => {
        return {
            content: [
                {
                    type: "text",
                    text: `Hola, ${nombre}. El servidor MCP funciona.`,
                },
            ],
        };
    }
);

registerListRepositoriesTool(server);
registerListIssuesTool(server);
registerCreateIssueTool(server);
registerCreateRepositoryTool(server);
registerCreateCommitTool(server);

const transport = new StdioServerTransport();

await server.connect(transport);

console.error("Servidor MCP conectado por stdio");