import { describe, expect, it } from "vitest";
import {
    ownerSchema,
    listRepositoriesSchema,
    createRepositorySchema,
    createIssueSchema,
    createCommitSchema,
    repositoryNameSchema,
} from "../src/schemas/index.js";

describe("ownerSchema", () => {
    it("acepta un propietario válido", () => {
        const result = ownerSchema.safeParse("carmuegaaldana");

        expect(result.success).toBe(true);
    });

    it("rechaza una URL en lugar del propietario", () => {
        const result = ownerSchema.safeParse(
            "https://github.com/carmuegaaldana"
        );

        expect(result.success).toBe(false);
    });
});

describe("repositoryNameSchema", () => {
    it("acepta un nombre válido", () => {
        const result = repositoryNameSchema.safeParse(
            "mcp-pruebas-aldana"
        );

        expect(result.success).toBe(true);
    });

    it("rechaza un nombre de menos de 3 caracteres", () => {
        const result = repositoryNameSchema.safeParse("ab");

        expect(result.success).toBe(false);
    });

    it("rechaza un nombre de más de 100 caracteres", () => {
        const result = repositoryNameSchema.safeParse("a".repeat(101));

        expect(result.success).toBe(false);
    });

    it("rechaza un nombre con espacios internos", () => {
        const result = repositoryNameSchema.safeParse("mi repositorio");

        expect(result.success).toBe(false);
    });
});

describe("contratos completos de las herramientas", () => {
    it("aplica los valores predeterminados de paginación", () => {
        expect(listRepositoriesSchema.parse({})).toEqual({ page: 1, perPage: 30 });
    });

    it("rechaza los límites y tipos inválidos de paginación", () => {
        expect(listRepositoriesSchema.safeParse({ perPage: 101 }).success).toBe(false);
        expect(listRepositoriesSchema.safeParse({ page: 0 }).success).toBe(false);
        expect(listRepositoriesSchema.safeParse({ page: 1.5 }).success).toBe(false);
        expect(listRepositoriesSchema.safeParse({ perPage: "5" }).success).toBe(false);
    });

    it("crea repositorios privados por defecto y exige una descripción", () => {
        const result = createRepositorySchema.parse({ name: "demo", description: "Prueba" });
        expect(result.isPrivate).toBe(true);
        expect(createRepositorySchema.safeParse({ name: "demo", description: " " }).success).toBe(false);
    });

    it("rechaza un título vacío después de quitar espacios", () => {
        expect(createIssueSchema.safeParse({
            owner: "equipo", repo: "demo", title: "   ", body: "Detalle",
        }).success).toBe(false);
    });

    it("preserva espacios y saltos de línea del contenido de un archivo", () => {
        const result = createCommitSchema.parse({
            owner: "equipo", repo: "demo", branch: "feature/login", path: "docs/a.txt",
            content: "  Hola\n", message: "Guardar archivo",
        });
        expect(result.content).toBe("  Hola\n");
    });

    it("permite un archivo vacío", () => {
        expect(createCommitSchema.safeParse({
            owner: "equipo", repo: "demo", branch: "main", path: "a.txt",
            content: "", message: "Crear archivo vacío",
        }).success).toBe(true);
    });

    it("rechaza rutas y ramas inválidas antes de consultar GitHub", () => {
        const input = { owner: "equipo", repo: "demo", branch: "main", path: "a.txt",
            content: "Hola", message: "Guardar" };
        for (const path of ["/a.txt", "../a.txt", "docs//a.txt", "docs/./a.txt", "docs/", "a\\b.txt"]) {
            expect(createCommitSchema.safeParse({ ...input, path }).success).toBe(false);
        }
        for (const branch of ["bad branch", "a..b", "refs//main", ".hidden", "main.lock"]) {
            expect(createCommitSchema.safeParse({ ...input, branch }).success).toBe(false);
        }
    });
});
