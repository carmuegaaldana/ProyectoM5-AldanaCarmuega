import { createCommitSchema } from "../schemas/index.js";
import { logToolError } from "../utils/logging.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCommit } from "../github/operations.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerCreateCommitTool(server: McpServer) {
    server.registerTool(
        "create_commit",
        {
            description:
                "Agrega o reemplaza un archivo de texto en una rama existente " +
                "de GitHub y crea un commit. " +
                "El contenido recibido reemplaza todo el archivo; no es un parche.",
            inputSchema: createCommitSchema.shape,
        },
        async ({ owner, repo, branch, path, content, message }) => {
            try {
                const result = await createCommit(
                    owner,
                    repo,
                    branch,
                    path,
                    content,
                    message
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            } catch (error: unknown) {
                const publicError = toGitHubAPIError(
                    error,
                    `el repositorio ${owner}/${repo}, la rama ${branch} o el archivo ${path}`
                );
                logToolError("create_commit", publicError);

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
