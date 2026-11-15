import { describe, expect, it } from "vitest";
import { InvalidCredentialsError, SlugTakenError, ValidationError } from "../../src/domain";
import { makeSut, registration } from "../helpers";

describe("Contas (spec 001)", () => {
  it("AC-001.1 cadastra restaurante, normaliza WhatsApp e devolve token", async () => {
    const { useCases } = makeSut();
    const session = await useCases.register.execute(registration);
    expect(session.token).toBeTruthy();
    expect(session.restaurant).toMatchObject({ slug: "pizzaria-do-ze", whatsapp: "5511987654321", isOpen: false });
  });

  it("AC-001.2 impede slug repetido", async () => {
    const { useCases } = makeSut();
    await useCases.register.execute(registration);
    await expect(
      useCases.register.execute({ ...registration, email: "outro@email.com" }),
    ).rejects.toThrow(SlugTakenError);
  });

  it("AC-001.4 senha errada e e-mail inexistente dão o mesmo erro", async () => {
    const { useCases } = makeSut();
    await useCases.register.execute(registration);
    await expect(useCases.login.execute({ email: registration.email, password: "errada!!" })).rejects.toThrow(
      InvalidCredentialsError,
    );
    await expect(useCases.login.execute({ email: "nao@existe.com", password: "x" })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it("login correto devolve sessão", async () => {
    const { useCases } = makeSut();
    await useCases.register.execute(registration);
    const session = await useCases.login.execute({ email: "ZE@pizzaria.com", password: registration.password });
    expect(session.restaurant.slug).toBe("pizzaria-do-ze");
  });

  it("AC-001.5 não permite desligar entrega e retirada juntas", async () => {
    const { useCases, tokens } = makeSut();
    const session = await useCases.register.execute(registration);
    const actor = (await tokens.verify(session.token))!;
    await expect(
      useCases.updateRestaurant.execute(actor, { acceptsDelivery: false, acceptsPickup: false }),
    ).rejects.toThrow(ValidationError);
  });
});
