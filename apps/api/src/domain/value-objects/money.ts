import { ValidationError } from "../errors/domain-error";

/** Dinheiro em centavos inteiros, nunca negativo. */
export class Money {
  static readonly ZERO = new Money(0);

  private constructor(readonly cents: number) {}

  static of(cents: number, field = "amount", max = Number.MAX_SAFE_INTEGER): Money {
    if (!Number.isSafeInteger(cents)) throw new ValidationError(field, "Use centavos inteiros");
    if (cents < 0) throw new ValidationError(field, "Valor não pode ser negativo");
    if (cents > max) throw new ValidationError(field, "Valor acima do limite");
    return new Money(cents);
  }

  static positive(cents: number, field: string, max?: number): Money {
    const money = Money.of(cents, field, max);
    if (money.cents === 0) throw new ValidationError(field, "Valor deve ser maior que zero");
    return money;
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  times(quantity: number): Money {
    return new Money(this.cents * quantity);
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  // Intl usa espaço não separável; normalizamos para a mensagem ficar limpa no WhatsApp.
  return brl.format(cents / 100).replace(/\s/g, " ");
}
