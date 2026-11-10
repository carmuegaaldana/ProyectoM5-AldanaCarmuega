import { listRepositoriesSchema } from "../schemas/index.js";
import { logToolError } from "../utils/logging.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listRepositories } from "../github/operations.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerListRepositoriesTool(server: McpServer) {
    server.registerTool(
        "list_repositories",
        {
            description:
                "Lista los repositorios propios del usuario autenticado en GitHub, " +
                "ordenados por actualización. Permite consultar distintas páginas.",
            inputSchema: listRepositoriesSchema.shape,
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
            } catch (error: unknown) {
                const publicError = toGitHubAPIError(
                    error,
                    "los repositorios del usuario autenticado"
                );
                logToolError("list_repositories", publicError);

                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: publicError.message,
                        },
                    ],
                };
            }
        }
    );
}
