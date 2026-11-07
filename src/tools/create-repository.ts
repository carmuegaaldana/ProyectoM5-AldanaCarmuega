import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createRepository } from "../github/operations.js";
import { repositoryNameSchema } from "../schemas/index.js";

export function registerCreateRepositoryTool(server: McpServer) {
    server.registerTool(
        "create_repository",
        {
            description:
                "Crea un repositorio en la cuenta personal del usuario autenticado. " +
                "Recibe nombre, descripción y visibilidad. " +
                "Inicializa el repositorio con un README.",
            inputSchema: {
                name: repositoryNameSchema.describe("Nombre del nuevo repositorio"),

                description: z
                    .string()
                    .trim()
                    .min(1, "La descripción no puede estar vacía")
                    .describe("Descripción del propósito del repositorio"),

                isPrivate: z
                    .boolean()
                    .default(true)
                    .describe("true para privado; false para público"),
            },
        },
        async ({ name, description, isPrivate }) => {
            try {
                const repository = await createRepository(
                    name,
                    description,
                    isPrivate
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(repository, null, 2),
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
                                `No se pudo crear el repositorio ${name}. ` +
                                "Verificá tus permisos, la conexión y que el nombre no esté en uso.",
                        },
                    ],
                };
            }
        }
    );
}