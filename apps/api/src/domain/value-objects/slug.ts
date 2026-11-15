import { ValidationError } from "../errors/domain-error";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED = new Set(["admin", "api", "login", "register", "cadastro", "entrar", "r", "app", "www", "static"]);

/** BR-001.1 — endereço público do restaurante: /r/<slug> */
export class Slug {
  private constructor(readonly value: string) {}

  static create(raw: string): Slug {
    const value = raw.trim();
    if (value.length < 3 || value.length > 40) throw new ValidationError("slug", "Use de 3 a 40 caracteres");
    if (!SLUG_PATTERN.test(value)) {
      throw new ValidationError("slug", "Use apenas letras minúsculas, números e hífen");
    }
    if (RESERVED.has(value)) throw new ValidationError("slug", "Este endereço é reservado");
    return new Slug(value);
  }
}
