import { describe, expect, it } from "vitest";
import { Phone, Slug, ValidationError, addDays, daysBetween, formatBRL, toLocalDate } from "../../src/domain";

describe("Slug (BR-001.1)", () => {
  it("AC-001.3 rejeita palavras reservadas e caracteres inválidos", () => {
    expect(() => Slug.create("admin")).toThrow(ValidationError);
    expect(() => Slug.create("Pizza Zé")).toThrow(ValidationError);
    expect(() => Slug.create("-pizza")).toThrow(ValidationError);
  });

  it("aceita letras minúsculas, números e hífen", () => {
    expect(Slug.create("pizzaria-do-ze-2").value).toBe("pizzaria-do-ze-2");
  });
});

describe("Phone (BR-001.2)", () => {
  it("normaliza máscaras e +55 para o formato do WhatsApp", () => {
    expect(Phone.create("(11) 98765-4321").digits).toBe("5511987654321");
    expect(Phone.create("+55 11 98765-4321").digits).toBe("5511987654321");
  });

  it("exige celular quando mobileOnly", () => {
    expect(() => Phone.create("(11) 3333-4444", "whatsapp", { mobileOnly: true })).toThrow(ValidationError);
    expect(Phone.create("(11) 3333-4444").digits).toBe("551133334444");
  });

  it("formata para exibição", () => {
    expect(Phone.restore("5511987654321").formatted()).toBe("(11) 98765-4321");
  });
});

describe("Datas locais (BR-005.3)", () => {
  it("usa o fuso do restaurante: 01:00 UTC ainda é o dia anterior em São Paulo", () => {
    expect(toLocalDate(new Date("2026-11-16T01:00:00Z"), "America/Sao_Paulo")).toBe("2026-11-15");
  });

  it("gera intervalos de dias atravessando o mês", () => {
    expect(daysBetween("2026-10-30", addDays("2026-10-30", 3))).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(8500)).toBe("R$ 85,00");
  });
});
