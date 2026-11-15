import { describe, expect, it } from "vitest";
import { centsToInput, formatPhoneDigits, maskPhone, parseBRLToCents, slugify } from "./format";

describe("format", () => {
  it("converte valores digitados em centavos sem float", () => {
    expect(parseBRLToCents("45,90")).toBe(4590);
    expect(parseBRLToCents("1.234,5")).toBe(123450);
    expect(parseBRLToCents("abc")).toBe(null);
    expect(parseBRLToCents(centsToInput(9905))).toBe(9905);
  });

  it("aplica máscara de telefone progressiva", () => {
    expect(maskPhone("11")).toBe("(11");
    expect(maskPhone("1198765")).toBe("(11) 9876-5");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhoneDigits("5511987654321")).toBe("(11) 98765-4321");
  });

  it("sugere slug a partir do nome", () => {
    expect(slugify("Pizzaria do Zé!")).toBe("pizzaria-do-ze");
    expect(slugify("  Açaí & Cia  ")).toBe("acai-cia");
  });
});
