import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRepositories } from "../github/operations.js";

export function registerListRepositoriesTool(server: McpServer) {
    server.registerTool(
        "list_repositories",
        {
            description:
                "Lista los repositorios propios del usuario autenticado en GitHub, " +
                "ordenados por actualización. Permite consultar distintas páginas.",
            inputSchema: {
                page: z.number().int().min(1).default(1)
                    .describe("Número de página, comenzando en 1"),
                perPage: z.number().int().min(1).max(100).default(30)
                    .describe("Cantidad de repositorios por página, entre 1 y 100"),
            },
        },
        async ({ page, perPage }) => {
            try {
                const repositories = await listRepositories(page, perPage);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ page, perPage, repositories }, null, 2),
                        },
                    ],
                };
            } catch {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text:
                                "No se pudieron listar los repositorios. " +
                                "Verificá tu conexión y la configuración del token de GitHub.",
                        },
                    ],
                };
            }
        }
    );
}