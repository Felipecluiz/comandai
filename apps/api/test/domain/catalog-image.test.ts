import { describe, expect, it } from "vitest";
import { isExternalImage } from "../../src/domain";

describe("isExternalImage", () => {
  it("reconhece URLs https como imagens externas (dados de demonstração)", () => {
    expect(isExternalImage("https://images.unsplash.com/photo-1?w=600")).toBe(true);
  });

  it("trata chaves do KV como imagens internas", () => {
    expect(isExternalImage("rest-1/prod-1-abc.jpg")).toBe(false);
    expect(isExternalImage("http://inseguro.com/a.jpg")).toBe(false);
  });
});
