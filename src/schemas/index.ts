import { z } from "zod";

export const ownerSchema = z.string().trim()
    .min(1, "El propietario no puede estar vacío")
    .max(39, "El propietario no puede superar 39 caracteres")
    .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
        "Usá letras, números y guiones simples entre caracteres")
    .describe("Usuario u organización propietaria del repositorio");

// Restricción de la consigna: más estricta que todos los nombres aceptados por GitHub.
export const repositoryNameSchema = z.string().trim()
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
    .max(100, "El nombre del repositorio no puede superar 100 caracteres")
    .regex(/^[a-zA-Z0-9-]+$/,
        "El repositorio solo puede contener letras, números y guiones")
    .describe("Nombre del repositorio, sin incluir el propietario");

export const pageSchema = z.number().int().min(1).default(1)
    .describe("Número de página, comenzando en 1");
export const perPageSchema = z.number().int().min(1).max(100).default(30)
    .describe("Cantidad de elementos por página, entre 1 y 100");

function isValidBranchName(value: string): boolean {
    if (value === "@" || value.startsWith("-") || value.includes("..") ||
        value.includes("@{") || /[\s\x00-\x1f\x7f~^:?*\[\\]/.test(value)) return false;
    return value.split("/").every((part) =>
        part !== "" && !part.startsWith(".") &&
        !part.endsWith(".") && !part.endsWith(".lock")
    );
}

export const branchSchema = z.string().trim().min(1, "La rama no puede estar vacía")
    .refine(isValidBranchName, "El nombre de la rama tiene un formato inválido")
    .describe("Nombre de una rama existente, por ejemplo main o feature/login");

export const filePathSchema = z.string().trim().min(1, "La ruta no puede estar vacía")
    .refine((value) => !value.includes("\\") && !value.includes("\0") &&
        value.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
        "Usá una ruta relativa de archivo, sin segmentos vacíos, . o ..")
    .describe("Ruta del archivo dentro del repositorio, por ejemplo docs/notas.txt");

export const listRepositoriesSchema = z.object({
    page: pageSchema,
    perPage: perPageSchema,
});

export const listIssuesSchema = z.object({
    owner: ownerSchema,
    repo: repositoryNameSchema,
    page: pageSchema,
    perPage: perPageSchema.describe("Elementos por página antes de excluir pull requests"),
});

export const createIssueSchema = z.object({
    owner: ownerSchema,
    repo: repositoryNameSchema,
    title: z.string().trim().min(1, "El título no puede estar vacío")
        .describe("Título breve del error, tarea o propuesta"),
    body: z.string().trim().min(1, "La descripción no puede estar vacía")
        .describe("Descripción del issue, admite Markdown"),
});

export const createRepositorySchema = z.object({
    name: repositoryNameSchema.describe("Nombre del nuevo repositorio"),
    description: z.string().trim().min(1, "La descripción no puede estar vacía")
        .describe("Descripción del propósito del repositorio"),
    isPrivate: z.boolean().default(true).describe("true para privado; false para público"),
});

export const createCommitSchema = z.object({
    owner: ownerSchema,
    repo: repositoryNameSchema,
    branch: branchSchema,
    path: filePathSchema,
    // No recortamos espacios ni saltos de línea del contenido.
    content: z.string().describe("Contenido completo del archivo como texto, no un parche"),
    message: z.string().trim().min(1, "El mensaje del commit no puede estar vacío")
        .describe("Mensaje que explica el cambio realizado"),
});
