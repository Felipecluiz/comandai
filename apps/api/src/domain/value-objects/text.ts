import { ValidationError } from "../errors/domain-error";

export interface TextRules {
  field: string;
  min: number;
  max: number;
}

/** Texto obrigatório (ou opcional, com min 0) com limites, sem espaços nas pontas. */
export function boundedText(raw: string, { field, min, max }: TextRules): string {
  const value = (raw ?? "").trim();
  if (value.length < min) throw new ValidationError(field, min === 1 ? "Obrigatório" : `Mínimo ${min} caracteres`);
  if (value.length > max) throw new ValidationError(field, `Máximo ${max} caracteres`);
  return value;
}

export function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}
