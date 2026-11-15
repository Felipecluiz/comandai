import { ValidationError } from "../errors/domain-error";

/**
 * Telefone brasileiro normalizado para o formato do WhatsApp: 55 + DDD + número (BR-001.2).
 * Aceita máscaras, +55, e fixos (10 dígitos) quando `mobileOnly` é falso.
 */
export class Phone {
  private constructor(readonly digits: string) {}

  static create(raw: string, field = "phone", { mobileOnly = false } = {}): Phone {
    let digits = raw.replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);

    const isMobile = digits.length === 11 && digits[2] === "9";
    const isLandline = digits.length === 10;
    const validDdd = /^[1-9][1-9]/.test(digits);

    if (!validDdd || !(isMobile || (isLandline && !mobileOnly))) {
      throw new ValidationError(field, mobileOnly ? "Informe um celular com DDD" : "Telefone inválido");
    }
    return new Phone(`55${digits}`);
  }

  static restore(digits: string): Phone {
    return new Phone(digits);
  }

  /** (11) 98765-4321 */
  formatted(): string {
    const local = this.digits.slice(2);
    const ddd = local.slice(0, 2);
    const number = local.slice(2);
    const split = number.length - 4;
    return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
  }
}
