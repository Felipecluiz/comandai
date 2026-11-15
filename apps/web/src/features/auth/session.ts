import type { RestaurantDto, SessionDto } from "@comandai/contracts";
import { createPersistentStore, useStore } from "../../shared/lib/store";

export const sessionStore = createPersistentStore<SessionDto | null>("comandai:session", null);

export function useSession(): SessionDto | null {
  return useStore(sessionStore);
}

export function updateSessionRestaurant(restaurant: RestaurantDto): void {
  sessionStore.set((s) => (s ? { ...s, restaurant } : s));
}

export function logout(): void {
  sessionStore.set(null);
}
