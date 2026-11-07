import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config({
    path: new URL("../../.env", import.meta.url),
    quiet: true,
});

export function createGitHubClient(): Octokit {
    const token = process.env.GITHUB_TOKEN?.trim();

    if (!token) {
        throw new Error("Falta configurar GITHUB_TOKEN en el archivo .env");
    }

    return new Octokit({
        auth: token,
    });
}