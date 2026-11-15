import { loginInputSchema, registerInputSchema, type SessionDto } from "@comandai/contracts";
import { Hono } from "hono";
import type { AppEnv } from "../container";
import { toRestaurantDto } from "../presenters";
import { validate } from "../validate";

export const authRoutes = new Hono<AppEnv>()
  .post("/register", validate("json", registerInputSchema), async (c) => {
    const { token, restaurant } = await c.var.useCases.register.execute(c.req.valid("json"));
    return c.json({ token, restaurant: toRestaurantDto(restaurant) } satisfies SessionDto, 201);
  })
  .post("/login", validate("json", loginInputSchema), async (c) => {
    const { token, restaurant } = await c.var.useCases.login.execute(c.req.valid("json"));
    return c.json({ token, restaurant: toRestaurantDto(restaurant) } satisfies SessionDto);
  });
