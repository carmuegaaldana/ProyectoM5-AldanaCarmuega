export class GitHubAPIError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message);
        this.name = "GitHubAPIError";
    }
}

export function getErrorStatus(error: unknown): number | undefined {
    if (
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
    ) {
        return error.status;
    }

    return undefined;
}

export function toGitHubAPIError(
    error: unknown,
    resource: string
): GitHubAPIError {
    const status = getErrorStatus(error);

    if (status === 404) {
        return new GitHubAPIError(
            `No se encontró ${resource} o no tenés acceso. ` +
            "Verificá el nombre y los permisos del token.",
            status
        );
    }

    return new GitHubAPIError(
        "No se pudo completar la operación en GitHub. " +
        "Verificá la configuración y la conexión.",
        status
    );
}