import { Octokit } from "@octokit/rest";
import { logEvent } from "../utils/logging.js";
import dotenv from "dotenv";
import { AuthenticationError } from "../errors/index.js";

dotenv.config({
    path: new URL("../../.env", import.meta.url),
    quiet: true,
});

export function createGitHubClient(): Octokit {
    const token = process.env.GITHUB_TOKEN?.trim();

    if (!token) {
        throw new AuthenticationError(
            "Falta configurar GITHUB_TOKEN en el archivo .env"
        );
    }

    return new Octokit({
        auth: token,
        request: { timeout: 10_000 },
        log: {
            debug: () => {},
            info: () => {},
            warn: () => logEvent("warn", "github_client_warning"),
            error: () => logEvent("error", "github_client_error"),
        },
    });
}
