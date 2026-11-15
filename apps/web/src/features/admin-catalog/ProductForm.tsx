import type { CategoryDto, ProductDto } from "@comandai/contracts";
import { useState, type FormEvent } from "react";
import { centsToInput, parseBRLToCents } from "../../shared/lib/format";
import { ErrorMessage, Field, fieldError, hasFieldErrors } from "../../shared/ui/feedback";
import { useSaveProduct, useUploadImage } from "./api";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface Props {
  product?: ProductDto;
  categories: CategoryDto[];
  defaultCategoryId?: string;
  onDone: () => void;
}

export function ProductForm({ product, categories, defaultCategoryId, onDone }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "");
  const [available, setAvailable] = useState(product?.available ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string>();

  const save = useSaveProduct();
  const upload = useUploadImage();
  const pending = save.isPending || upload.isPending;
  const err = (field: string) => fieldError(save.error, field);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const priceCents = parseBRLToCents(price);
    if (!priceCents) return setLocalError("Informe o preço, ex.: 39,90");
    if (file && file.size > MAX_IMAGE_BYTES) return setLocalError("A imagem deve ter até 2 MB");
    setLocalError(undefined);

    save.mutate(
      { id: product?.id, input: { name, description, priceCents, categoryId, available } },
      {
        onSuccess: (saved) => {
          if (!file) return onDone();
          upload.mutate({ id: saved.id, file }, { onSuccess: onDone });
        },
      },
    );
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Nome" error={err("name")}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus />
      </Field>
      <Field label="Descrição" error={err("description")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} />
      </Field>
      <div className="grid-2">
        <Field label="Preço (R$)" error={localError ?? err("priceCents")}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" />
        </Field>
        <Field label="Categoria" error={err("categoryId")}>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Foto" hint="JPG, PNG ou WEBP até 2 MB">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <label className="switch">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
        <span>Disponível no cardápio</span>
      </label>

      {save.error && !hasFieldErrors(save.error) && <ErrorMessage error={save.error} />}
      {upload.error && <ErrorMessage error={upload.error} />}

      <footer className="form__actions">
        <button type="button" className="btn" onClick={onDone}>
          Cancelar
        </button>
        <button className="btn btn--primary" disabled={pending || !categoryId}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </footer>
    </form>
  );
}
