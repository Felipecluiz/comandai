import type { CategoryDto, ProductDto } from "@comandai/contracts";
import { useState } from "react";
import { formatCents } from "../../shared/lib/format";
import { EmptyState, ErrorMessage, Loading } from "../../shared/ui/feedback";
import { Modal } from "../../shared/ui/Modal";
import {
  useCatalog,
  useCreateCategory,
  useDeleteCategory,
  useDeleteProduct,
  useRenameCategory,
  useReorderCategories,
  useSaveProduct,
} from "./api";
import { ProductForm } from "./ProductForm";

type Editing = { mode: "closed" } | { mode: "product"; product?: ProductDto; categoryId?: string };

export function CatalogPage() {
  const { data, isLoading, error } = useCatalog();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();
  const reorder = useReorderCategories();
  const deleteProduct = useDeleteProduct();
  const toggleProduct = useSaveProduct();
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorMessage error={error} />;

  const { categories, products } = data;
  const mutationError = createCategory.error ?? renameCategory.error ?? deleteCategory.error ?? reorder.error;

  const addCategory = () => {
    const name = window.prompt("Nome da categoria (ex.: Pizzas, Bebidas):");
    if (name?.trim()) createCategory.mutate(name.trim());
  };

  const move = (index: number, delta: number) => {
    const ids = categories.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids);
  };

  const rename = (category: CategoryDto) => {
    const name = window.prompt("Novo nome:", category.name);
    if (name?.trim() && name !== category.name) renameCategory.mutate({ id: category.id, name: name.trim() });
  };

  return (
    <section>
      <header className="page-header">
        <h1>Cardápio</h1>
        <div className="toolbar">
          <button className="btn" onClick={addCategory}>
            + Categoria
          </button>
          <button
            className="btn btn--primary"
            disabled={categories.length === 0}
            onClick={() => setEditing({ mode: "product" })}
          >
            + Produto
          </button>
        </div>
      </header>

      {mutationError && <ErrorMessage error={mutationError} />}
      {deleteProduct.error && <ErrorMessage error={deleteProduct.error} />}

      {categories.length === 0 && (
        <EmptyState title="Comece criando uma categoria">Ex.: Pizzas, Lanches, Bebidas, Sobremesas.</EmptyState>
      )}

      {categories.map((category, index) => {
        const items = products.filter((p) => p.categoryId === category.id);
        return (
          <div key={category.id} className="card catalog-section">
            <header className="catalog-section__head">
              <div className="reorder">
                <button className="btn-icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir">
                  ↑
                </button>
                <button
                  className="btn-icon"
                  onClick={() => move(index, 1)}
                  disabled={index === categories.length - 1}
                  aria-label="Descer"
                >
                  ↓
                </button>
              </div>
              <h2 className="grow">
                {category.name} <span className="count">{items.length}</span>
              </h2>
              <button className="btn-link" onClick={() => setEditing({ mode: "product", categoryId: category.id })}>
                + Produto
              </button>
              <button className="btn-link" onClick={() => rename(category)}>
                Renomear
              </button>
              <button
                className="btn-link danger"
                onClick={() => window.confirm(`Excluir "${category.name}"?`) && deleteCategory.mutate(category.id)}
              >
                Excluir
              </button>
            </header>

            <ul className="catalog-list">
              {items.length === 0 && <li className="muted small">Nenhum produto nesta categoria.</li>}
              {items.map((product) => (
                <li key={product.id} className={product.available ? "" : "is-paused"}>
                  {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="thumb-placeholder">🍽</div>}
                  <div className="grow">
                    <strong>{product.name}</strong>
                    <small className="muted">{product.description}</small>
                  </div>
                  <span className="price">{formatCents(product.priceCents)}</span>
                  <label className="switch" title="Disponível">
                    <input
                      type="checkbox"
                      checked={product.available}
                      onChange={(e) => toggleProduct.mutate({ id: product.id, input: { available: e.target.checked } })}
                    />
                    <span className="small">{product.available ? "Ativo" : "Pausado"}</span>
                  </label>
                  <button className="btn-link" onClick={() => setEditing({ mode: "product", product })}>
                    Editar
                  </button>
                  <button
                    className="btn-link danger"
                    onClick={() => window.confirm(`Excluir "${product.name}"?`) && deleteProduct.mutate(product.id)}
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <Modal
        title={editing.mode === "product" && editing.product ? "Editar produto" : "Novo produto"}
        open={editing.mode === "product"}
        onClose={() => setEditing({ mode: "closed" })}
      >
        {editing.mode === "product" && (
          <ProductForm
            product={editing.product}
            categories={categories}
            defaultCategoryId={editing.categoryId}
            onDone={() => setEditing({ mode: "closed" })}
          />
        )}
      </Modal>
    </section>
  );
}
