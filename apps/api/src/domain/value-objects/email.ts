import { ValidationError } from "../errors/domain-error";

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new ValidationError("email", "E-mail inválido");
    }
    return new Email(value);
  }
}

export const MIN_PASSWORD_LENGTH = 8;

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError("password", `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
  }
}
