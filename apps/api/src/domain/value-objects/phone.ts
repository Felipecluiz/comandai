import { ValidationError } from "../errors/domain-error";

/**
 * Telefone brasileiro normalizado para o formato do WhatsApp: 55 + DDD + número (BR-001.2).
 * Aceita máscaras, +55, e fixos (10 dígitos) quando `mobileOnly` é falso.
 */
export class Phone {
  private constructor(readonly digits: string) {}

  static create(raw: string, field = "phone", { mobileOnly = false } = {}): Phone {
    const local = withoutCountryCode(raw.replace(/\D/g, ""));
    if (!isValidBrazilianNumber(local, mobileOnly)) {
      throw new ValidationError(field, mobileOnly ? "Informe um celular com DDD" : "Telefone inválido");
    }
    return new Phone(`55${local}`);
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

/** "5511987654321" → "11987654321" (o +55 é opcional na entrada). */
function withoutCountryCode(digits: string): string {
  const hasCountryCode = digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  return hasCountryCode ? digits.slice(2) : digits;
}

/** DDD válido + celular (11 dígitos começando em 9) ou fixo (10 dígitos), se permitido. */
function isValidBrazilianNumber(local: string, mobileOnly: boolean): boolean {
  if (!/^[1-9][1-9]/.test(local)) return false;
  const isMobile = local.length === 11 && local[2] === "9";
  const isLandline = local.length === 10;
  return isMobile || (isLandline && !mobileOnly);
}
