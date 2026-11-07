import { createGitHubClient } from "./client.js";

export async function listRepositories(page: number, perPage: number) {
    const client = createGitHubClient();

    const { data } = await client.repos.listForAuthenticatedUser({
        affiliation: "owner",
        sort: "updated",
        direction: "desc",
        page,
        per_page: perPage,
    });

    return data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
    }));
}

export async function listIssues(
    owner: string,
    repo: string,
    page: number,
    perPage: number
) {
    const client = createGitHubClient();

    const { data } = await client.issues.listForRepo({
        owner,
        repo,
        state: "open",
        sort: "created",
        direction: "desc",
        page,
        per_page: perPage,
    });

    return data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            url: issue.html_url,
            author: issue.user?.login,
        }));
}

export async function createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string
) {
    const client = createGitHubClient();

    const { data } = await client.issues.create({
        owner,
        repo,
        title,
        body,
    });

    return {
        number: data.number,
        title: data.title,
        body: data.body,
        url: data.html_url,
    };
}

export async function createRepository(
    name: string,
    description: string,
    isPrivate: boolean
) {
    const client = createGitHubClient();

    const { data } = await client.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true,
    });

    return {
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        private: data.private,
        defaultBranch: data.default_branch,
    };
}

export async function createCommit(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string
) {
    const client = createGitHubClient();

    // Comprobamos que el repositorio y la rama sean accesibles.
    await client.repos.getBranch({
        owner,
        repo,
        branch,
    });

    let sha: string | undefined;

    try {
        const { data } = await client.repos.getContent({
            owner,
            repo,
            path,
            ref: branch,
        });

        if (Array.isArray(data) || data.type !== "file") {
            throw new Error("La ruta debe corresponder a un archivo");
        }

        sha = data.sha;
    } catch (error: unknown) {
        const isNotFound =
            error !== null &&
            typeof error === "object" &&
            "status" in error &&
            error.status === 404;

        if (!isNotFound) {
            throw error;
        }

        // Si el archivo no existe, lo crearemos sin SHA.
    }

    const { data } = await client.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path,
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
    });

    return {
        path,
        branch,
        action: sha ? "updated" : "created",
        commitSha: data.commit.sha,
        commitUrl: data.commit.html_url,
        fileUrl: data.content?.html_url,
    };
}