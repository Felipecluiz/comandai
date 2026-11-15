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

  useEffect(() => {
    if (menu) cart.syncWithMenu(menu.sections.flatMap((s) => s.products));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  if (isLoading) return <Loading label="Carregando cardápio…" />;
  if (error || !menu) return <div className="menu"><ErrorMessage error={error} /></div>;

  const { restaurant, sections } = menu;

  return (
    <div className="menu">
      <header className="menu__hero">
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
            {restaurant.minOrderCents > 0 && <span>Mínimo {formatCents(restaurant.minOrderCents)}</span>}
          </p>
        </div>
      </header>

      {!restaurant.isOpen && (
        <p className="notice">Estamos fechados no momento. Você pode ver o cardápio, mas não é possível pedir agora.</p>
      )}

      {sections.length > 0 && (
        <nav className="menu__tabs" aria-label="Categorias">
          {sections.map((s) => (
            <a key={s.id} href={`#cat-${s.id}`}>
              {s.name}
            </a>
          ))}
        </nav>
      )}

      {sections.length === 0 && <EmptyState title="Cardápio em construção">Volte em breve!</EmptyState>}

      {sections.map((section) => (
        <section key={section.id} id={`cat-${section.id}`} className="menu__section">
          <h2>{section.name}</h2>
          <ul className="product-list">
            {section.products.map((product) => (
              <li key={product.id}>
                <button className="product-card" onClick={() => setSelected(product)} disabled={!restaurant.isOpen}>
                  <div className="product-card__text">
                    <strong>{product.name}</strong>
                    {product.description && <p>{product.description}</p>}
                    <span className="price">{formatCents(product.priceCents)}</span>
                  </div>
                  {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="menu__footer">
        Feito com <Link to="/">Comandaí</Link>
      </footer>

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
