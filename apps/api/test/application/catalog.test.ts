import { describe, expect, it } from "vitest";
import { CategoryNotEmptyError, InvalidImageError, NotFoundError, ValidationError } from "../../src/domain";
import { openRestaurantWithMenu } from "../helpers";

const png = { data: new Uint8Array([137, 80, 78, 71]).buffer, contentType: "image/png" };

describe("Catálogo (spec 002)", () => {
  it("AC-002.1 nova categoria vai para o fim", async () => {
    const { useCases, actor } = await openRestaurantWithMenu();
    const drinks = await useCases.catalog.createCategory(actor, "Bebidas");
    expect(drinks.position).toBe(1);
  });

  it("AC-002.2 não exclui categoria com produtos", async () => {
    const { useCases, actor, pizzas } = await openRestaurantWithMenu();
    await expect(useCases.catalog.deleteCategory(actor, pizzas.id)).rejects.toThrow(CategoryNotEmptyError);
  });

  it("AC-002.3 rejeita produto com preço zero", async () => {
    const { useCases, actor, pizzas } = await openRestaurantWithMenu();
    await expect(
      useCases.catalog.createProduct(actor, {
        categoryId: pizzas.id,
        name: "Grátis",
        description: "",
        priceCents: 0,
        available: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("AC-002.4 não cria produto em categoria de outro restaurante", async () => {
    const { useCases, pizzas } = await openRestaurantWithMenu();
    const intruder = { ownerId: "x", restaurantId: "outro-restaurante" };
    await expect(
      useCases.catalog.createProduct(intruder, {
        categoryId: pizzas.id,
        name: "Invasora",
        description: "",
        priceCents: 100,
        available: true,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("AC-002.5 rejeita arquivo que não é imagem", async () => {
    const { useCases, actor, calabresa } = await openRestaurantWithMenu();
    await expect(
      useCases.catalog.uploadProductImage(actor, calabresa.id, { data: png.data, contentType: "application/pdf" }),
    ).rejects.toThrow(InvalidImageError);
  });

  it("BR-002.5 trocar a foto apaga a anterior do storage", async () => {
    const { useCases, actor, calabresa, images } = await openRestaurantWithMenu();
    const first = await useCases.catalog.uploadProductImage(actor, calabresa.id, png);
    const second = await useCases.catalog.uploadProductImage(actor, calabresa.id, png);
    expect(images.files.has(first.imageKey!)).toBe(false);
    expect(images.files.has(second.imageKey!)).toBe(true);
  });

  it("AC-002.6 cardápio público esconde pausados e categorias vazias", async () => {
    const { useCases, actor, calabresa, slug } = await openRestaurantWithMenu();
    await useCases.catalog.createCategory(actor, "Sobremesas"); // vazia
    await useCases.catalog.updateProduct(actor, calabresa.id, { available: false });

    const menu = await useCases.getPublicMenu.execute(slug);
    expect(menu.sections).toHaveLength(0);
  });

  it("AC-002.7 reordena categorias", async () => {
    const { useCases, actor, pizzas } = await openRestaurantWithMenu();
    const drinks = await useCases.catalog.createCategory(actor, "Bebidas");
    const desserts = await useCases.catalog.createCategory(actor, "Sobremesas");

    await useCases.catalog.reorderCategories(actor, [desserts.id, pizzas.id, drinks.id]);
    const { categories } = await useCases.catalog.getAdminCatalog(actor);
    expect(categories.map((c) => [c.name, c.position])).toEqual([
      ["Sobremesas", 0],
      ["Pizzas", 1],
      ["Bebidas", 2],
    ]);
  });
});
