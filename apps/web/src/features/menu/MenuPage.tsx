import type { ProductDto } from "@comandai/contracts";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatCents } from "../../shared/lib/format";
import { EmptyState, ErrorMessage, Loading } from "../../shared/ui/feedback";
import { useCart } from "../cart/cart";
import { CartBar } from "../cart/CartBar";
import { usePublicMenu } from "./api";
import { ProductSheet } from "./ProductSheet";

export function MenuPage() {
  const { slug = "" } = useParams();
  const { data: menu, isLoading, error } = usePublicMenu(slug);
  const cart = useCart(slug);
  const [selected, setSelected] = useState<ProductDto | null>(null);
  const activeSection = useActiveSection(menu?.sections.map((s) => s.id).join(",") ?? "");

  useEffect(() => {
    if (menu) cart.syncWithMenu(menu.sections.flatMap((s) => s.products));
  }, [menu]);

  if (isLoading) return <Loading label="Carregando cardápio…" />;
  if (error || !menu) return <div className="menu"><ErrorMessage error={error} /></div>;

  const { restaurant, sections } = menu;

  return (
    <div className="menu">
      <header className="menu__cover">
        <div className="menu__cover-inner">
          <div className="menu__avatar" aria-hidden>
            {restaurant.name.charAt(0)}
          </div>
          <div>
            <h1>{restaurant.name}</h1>
            <p className="menu__meta">
              <span className={`badge ${restaurant.isOpen ? "badge--open" : "badge--closed"}`}>
                {restaurant.isOpen ? "Aberto agora" : "Fechado"}
              </span>
              {restaurant.acceptsDelivery && <span>Entrega {formatCents(restaurant.deliveryFeeCents)}</span>}
              {restaurant.acceptsPickup && <span>Retirada grátis</span>}
              {restaurant.minOrderCents > 0 && <span>Pedido mínimo {formatCents(restaurant.minOrderCents)}</span>}
            </p>
          </div>
        </div>
      </header>

      <div className="menu__body">
        {sections.length > 0 && (
          <nav className="menu__tabs" aria-label="Categorias">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#cat-${s.id}`}
                className={activeSection === s.id ? "is-active" : undefined}
                aria-current={activeSection === s.id ? "true" : undefined}
              >
                {s.name}
              </a>
            ))}
          </nav>
        )}

        {!restaurant.isOpen && (
          <p className="notice">Estamos fechados no momento. Você pode ver o cardápio, mas não é possível pedir agora.</p>
        )}

        {sections.length === 0 && <EmptyState title="Cardápio em construção">Volte em breve!</EmptyState>}

        {sections.map((section) => (
          <section key={section.id} id={`cat-${section.id}`} className="menu__section" data-section={section.id}>
            <div className="menu__section-head">
              <h2>{section.name}</h2>
              <span>{section.products.length} {section.products.length === 1 ? "item" : "itens"}</span>
            </div>
            <ul className="product-list">
              {section.products.map((product) => {
                const soldOut = !product.available;
                return (
                  <li key={product.id}>
                    <button
                      className={`product-card${soldOut ? " is-soldout" : ""}`}
                      onClick={() => setSelected(product)}
                      disabled={!restaurant.isOpen || soldOut}
                    >
                      <div className="product-card__text">
                        <strong>{product.name}</strong>
                        {product.description && <p>{product.description}</p>}
                        <div className="product-card__foot">
                          <span className="price">{formatCents(product.priceCents)}</span>
                          {soldOut ? (
                            <span className="product-card__soldout">Esgotado</span>
                          ) : (
                            restaurant.isOpen && (
                              <span className="product-card__add" aria-hidden>
                                +
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div className="product-card__media">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <span className="product-card__placeholder" aria-hidden>
                            {product.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <footer className="menu__footer">
          Feito com <Link to="/">Comandaí</Link>
        </footer>
      </div>

      {selected && (
        <ProductSheet
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={(quantity, notes) => {
            cart.add(selected, quantity, notes);
            setSelected(null);
          }}
        />
      )}

      {restaurant.isOpen && <CartBar slug={slug} />}
    </div>
  );
}

/** Destaca na barra de categorias a seção que está visível na tela. */
function useActiveSection(sectionIds: string): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionIds || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.section ?? "";
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const first = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        if (first) setActive(first[0]);
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}
