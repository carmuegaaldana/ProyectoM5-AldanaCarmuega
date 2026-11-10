import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommit, createIssue, createRepository, listIssues, listRepositories } from "../src/github/operations.js";
import { ValidationError } from "../src/errors/index.js";

const mocks = vi.hoisted(() => ({
    createIssue: vi.fn(),
    listRepositories: vi.fn(),
    createRepository: vi.fn(),
    listIssues: vi.fn(),
    getBranch: vi.fn(),
    getContent: vi.fn(),
    saveFile: vi.fn(),
}));

vi.mock("../src/github/client.js", () => ({
    createGitHubClient: () => ({
        issues: {
            create: mocks.createIssue,
            listForRepo: mocks.listIssues,
        },
        repos: {
            listForAuthenticatedUser: mocks.listRepositories,
            createForAuthenticatedUser: mocks.createRepository,
            getBranch: mocks.getBranch,
            getContent: mocks.getContent,
            createOrUpdateFileContents: mocks.saveFile,
        },
    }),
}));
beforeEach(() => {
    vi.resetAllMocks();
});

describe("createIssue", () => {
    it("envía los datos a GitHub y devuelve el issue creado", async () => {
        mocks.createIssue.mockResolvedValue({
            data: {
                number: 7,
                title: "Corregir login",
                body: "El formulario no permite ingresar.",
                html_url: "https://github.com/equipo/demo/issues/7",
            },
        });

        const result = await createIssue(
            "equipo",
            "demo",
            "Corregir login",
            "El formulario no permite ingresar."
        );

        expect(mocks.createIssue).toHaveBeenCalledExactlyOnceWith({
            owner: "equipo",
            repo: "demo",
            title: "Corregir login",
            body: "El formulario no permite ingresar.",
        });

        expect(result).toEqual({
            number: 7,
            title: "Corregir login",
            body: "El formulario no permite ingresar.",
            url: "https://github.com/equipo/demo/issues/7",
        });
    });
});

describe("listIssues", () => {
    it("solicita issues abiertos y excluye los pull requests", async () => {
        mocks.listIssues.mockResolvedValue({
            data: [
                {
                    number: 1,
                    title: "Un error",
                    body: "Descripción del error",
                    html_url: "https://github.com/equipo/demo/issues/1",
                    user: { login: "aldana" },
                },
                {
                    number: 2,
                    title: "Un pull request",
                    pull_request: {
                        url: "https://api.github.com/repos/equipo/demo/pulls/2",
                    },
                },
            ],
        });

        const result = await listIssues("equipo", "demo", 1, 5);

        expect(mocks.listIssues).toHaveBeenCalledExactlyOnceWith({
            owner: "equipo",
            repo: "demo",
            state: "open",
            sort: "created",
            direction: "desc",
            page: 1,
            per_page: 5,
        });

        expect(result).toEqual([
            {
                number: 1,
                title: "Un error",
                body: "Descripción del error",
                url: "https://github.com/equipo/demo/issues/1",
                author: "aldana",
            },
        ]);
    });

    it("propaga un error de GitHub para que el handler lo transforme", async () => {
        const githubError = { status: 401 };

        mocks.listIssues.mockRejectedValue(githubError);

        await expect(
            listIssues("equipo", "demo", 1, 5)
        ).rejects.toBe(githubError);
    });
});

describe("createCommit", () => {
    beforeEach(() => {
        mocks.getBranch.mockResolvedValue({
            data: { name: "main" },
        });

        mocks.saveFile.mockResolvedValue({
            data: {
                commit: {
                    sha: "commit-simulado",
                    html_url: "https://github.com/equipo/demo/commit/commit-simulado",
                },
                content: {
                    html_url: "https://github.com/equipo/demo/blob/main/prueba.txt",
                },
            },
        });
    });

    it("crea un archivo nuevo sin enviar SHA y codifica el contenido", async () => {
        mocks.getContent.mockRejectedValue({ status: 404 });

        const result = await createCommit(
            "equipo",
            "demo",
            "main",
            "prueba.txt",
            "Hola",
            "Agregar archivo"
        );

        expect(mocks.saveFile).toHaveBeenCalledExactlyOnceWith({
            owner: "equipo",
            repo: "demo",
            branch: "main",
            path: "prueba.txt",
            message: "Agregar archivo",
            content: "SG9sYQ==",
        });

        expect(result.action).toBe("created");
        expect(result.commitSha).toBe("commit-simulado");
    });

    it("actualiza un archivo usando su SHA y la misma rama", async () => {
        mocks.getContent.mockResolvedValue({
            data: {
                type: "file",
                sha: "sha-del-archivo",
            },
        });

        const result = await createCommit(
            "equipo",
            "demo",
            "main",
            "prueba.txt",
            "Nuevo contenido",
            "Actualizar archivo"
        );

        expect(mocks.getContent).toHaveBeenCalledExactlyOnceWith({
            owner: "equipo",
            repo: "demo",
            path: "prueba.txt",
            ref: "main",
        });

        expect(mocks.saveFile).toHaveBeenCalledExactlyOnceWith({
            owner: "equipo",
            repo: "demo",
            branch: "main",
            path: "prueba.txt",
            message: "Actualizar archivo",
            content: Buffer.from("Nuevo contenido", "utf8").toString("base64"),
            sha: "sha-del-archivo",
        });

        expect(result.action).toBe("updated");
    });

    it("no intenta guardar si la lectura del archivo falla con un 403", async () => {
        const githubError = { status: 403 };

        mocks.getContent.mockRejectedValue(githubError);

        await expect(
            createCommit(
                "equipo",
                "demo",
                "main",
                "prueba.txt",
                "Hola",
                "Agregar archivo"
            )
        ).rejects.toBe(githubError);

        expect(mocks.saveFile).not.toHaveBeenCalled();
    });

    it("rechaza una carpeta sin intentar guardar un archivo", async () => {
        mocks.getContent.mockResolvedValue({
            data: [
                {
                    type: "file",
                    name: "notas.txt",
                },
            ],
        });

        await expect(
            createCommit(
                "equipo",
                "demo",
                "main",
                "docs",
                "Contenido de prueba",
                "Intentar modificar una carpeta"
            )
        ).rejects.toBeInstanceOf(ValidationError);

        expect(mocks.saveFile).not.toHaveBeenCalled();
    });
});

describe("listRepositories", () => {
    it("consulta la página solicitada y devuelve solo campos útiles", async () => {
        mocks.listRepositories.mockResolvedValue({ data: [{
            name: "demo", full_name: "equipo/demo", description: null,
            html_url: "https://github.com/equipo/demo", private: true,
        }] });
        const result = await listRepositories(2, 5);
        expect(mocks.listRepositories).toHaveBeenCalledExactlyOnceWith({
            affiliation: "owner", sort: "updated", direction: "desc", page: 2, per_page: 5,
        });
        expect(result).toEqual([{
            name: "demo", fullName: "equipo/demo", description: null,
            url: "https://github.com/equipo/demo", private: true,
        }]);
    });
});

describe("createRepository", () => {
    it("respeta la visibilidad e inicializa el README", async () => {
        mocks.createRepository.mockResolvedValue({ data: {
            name: "demo", full_name: "equipo/demo", html_url: "https://github.com/equipo/demo",
            private: true, default_branch: "main",
        } });
        const result = await createRepository("demo", "Prueba", true);
        expect(mocks.createRepository).toHaveBeenCalledExactlyOnceWith({
            name: "demo", description: "Prueba", private: true, auto_init: true,
        });
        expect(result).toEqual({
            name: "demo", fullName: "equipo/demo", url: "https://github.com/equipo/demo",
            private: true, defaultBranch: "main",
        });
    });
});

describe("escrituras y errores", () => {
    it("no reintenta crear un issue si se pierde la respuesta", async () => {
        const error = { code: "ECONNRESET" };
        mocks.createIssue.mockRejectedValue(error);
        await expect(createIssue("equipo", "demo", "Título", "Descripción")).rejects.toBe(error);
        expect(mocks.createIssue).toHaveBeenCalledTimes(1);
    });

    it("no reintenta crear un repositorio si GitHub responde 503", async () => {
        const error = { status: 503 };
        mocks.createRepository.mockRejectedValue(error);
        await expect(createRepository("demo", "Prueba", true)).rejects.toBe(error);
        expect(mocks.createRepository).toHaveBeenCalledTimes(1);
    });

    it("no busca ni escribe un archivo si la rama no existe", async () => {
        const error = { status: 404 };
        mocks.getBranch.mockRejectedValue(error);
        await expect(createCommit("equipo", "demo", "ausente", "a.txt", "Hola", "Prueba"))
            .rejects.toBe(error);
        expect(mocks.getContent).not.toHaveBeenCalled();
        expect(mocks.saveFile).not.toHaveBeenCalled();
    });

    it("no repite un commit si se pierde la respuesta al guardar", async () => {
        mocks.getBranch.mockResolvedValue({ data: { name: "main" } });
        mocks.getContent.mockRejectedValue({ status: 404 });
        const error = { code: "ECONNRESET" };
        mocks.saveFile.mockRejectedValue(error);
        await expect(createCommit("equipo", "demo", "main", "a.txt", "Hola", "Prueba"))
            .rejects.toBe(error);
        expect(mocks.saveFile).toHaveBeenCalledTimes(1);
    });
});
