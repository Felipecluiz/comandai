import type { RestaurantDto } from "@comandai/contracts";
import { useMutation } from "@tanstack/react-query";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { adminApi } from "../shared/api/http";
import { logout, updateSessionRestaurant, useSession } from "../features/auth/session";

export function AdminLayout() {
  const session = useSession();
  const toggleOpen = useMutation({
    mutationFn: (isOpen: boolean) => adminApi.patch<RestaurantDto>("/restaurant", { isOpen }),
    onSuccess: updateSessionRestaurant,
  });

  if (!session) return <Navigate to="/login" replace />;
  const { restaurant } = session;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__head">
          <span className="brand">
            <span className="brand__mark">◉</span> Comandaí
          </span>
          <strong className="sidebar__restaurant">{restaurant.name}</strong>
          <button
            className={`store-toggle ${restaurant.isOpen ? "is-open" : ""}`}
            onClick={() => toggleOpen.mutate(!restaurant.isOpen)}
            disabled={toggleOpen.isPending}
            aria-pressed={restaurant.isOpen}
          >
            <span className="store-toggle__dot" /> {restaurant.isOpen ? "Loja aberta" : "Loja fechada"}
          </button>
        </div>

        <nav>
          <NavLink to="/admin" end>
            🧾 Pedidos
          </NavLink>
          <NavLink to="/admin/cardapio">🍕 Cardápio</NavLink>
          <NavLink to="/admin/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/admin/configuracoes">⚙️ Configurações</NavLink>
        </nav>

        <div className="sidebar__foot">
          <a href={`/r/${restaurant.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block">
            Ver meu cardápio ↗
          </a>
          <button className="btn-link" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
