import { sign, verify } from "hono/jwt";
import type { Actor, Clock, TokenService } from "../../application";

const TTL_SECONDS = 12 * 60 * 60; // constitution V.2

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {
    if (!secret || secret.length < 32) throw new Error("JWT_SECRET precisa ter ao menos 32 caracteres");
  }

  async sign({ ownerId, restaurantId }: Actor): Promise<string> {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    return sign({ sub: ownerId, rid: restaurantId, iat, exp: iat + TTL_SECONDS }, this.secret, "HS256");
  }

  async verify(token: string): Promise<Actor | null> {
    try {
      const payload = await verify(token, this.secret, "HS256");
      if (typeof payload.sub !== "string" || typeof payload.rid !== "string") return null;
      return { ownerId: payload.sub, restaurantId: payload.rid };
    } catch {
      return null; // assinatura inválida ou expirado
    }
  }
}
