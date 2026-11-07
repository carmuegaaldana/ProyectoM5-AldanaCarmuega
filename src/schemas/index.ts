import { z } from "zod";

export const ownerSchema = z
    .string()
    .trim()
    .min(1, "El propietario no puede estar vacío")
    .regex(
        /^[a-zA-Z0-9-]+$/,
        "El propietario solo puede contener letras, números y guiones"
    )
    .describe("Usuario u organización propietaria del repositorio");

export const repositoryNameSchema = z
    .string()
    .trim()
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
    .max(100, "El nombre del repositorio no puede superar 100 caracteres")
    .regex(
        /^[a-zA-Z0-9-]+$/,
        "El repositorio solo puede contener letras, números y guiones"
    )
    .describe("Nombre del repositorio, sin incluir el propietario");