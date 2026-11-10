import { createIssueSchema } from "../schemas/index.js";
import { logToolError } from "../utils/logging.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIssue } from "../github/operations.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerCreateIssueTool(server: McpServer) {
    server.registerTool(
        "create_issue",
        {
            description:
                "Crea un issue en un repositorio de GitHub. " +
                "Usar cuando el usuario solicite registrar un error, tarea o propuesta. " +
                "Requiere propietario, repositorio, título y descripción.",
            inputSchema: createIssueSchema.shape,
        },
        async ({ owner, repo, title, body }) => {
            try {
                const issue = await createIssue(owner, repo, title, body);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(issue, null, 2),
                        },
                    ],
                };
            } catch (error: unknown) {
                const publicError = toGitHubAPIError(
                    error,
                    `el repositorio ${owner}/${repo}`
                );
                logToolError("create_issue", publicError);

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
