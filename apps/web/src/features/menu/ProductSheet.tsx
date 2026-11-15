import type { ProductDto } from "@comandai/contracts";
import { useState } from "react";
import { formatCents } from "../../shared/lib/format";
import { Modal } from "../../shared/ui/Modal";
import { QuantityStepper } from "../cart/QuantityStepper";

interface Props {
  product: ProductDto;
  onClose: () => void;
  onAdd: (quantity: number, notes: string) => void;
}

export function ProductSheet({ product, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  return (
    <Modal title={product.name} open onClose={onClose}>
      {product.imageUrl && <img className="sheet__image" src={product.imageUrl} alt="" />}
      {product.description && <p className="muted">{product.description}</p>}

      <label className="field">
        <span className="field__label">Alguma observação?</span>
        <textarea
          rows={2}
          maxLength={140}
          placeholder="Ex.: sem cebola, bem passada…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <footer className="sheet__footer">
        <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
        <button className="btn btn--primary btn--grow" onClick={() => onAdd(quantity, notes)}>
          Adicionar · {formatCents(product.priceCents * quantity)}
        </button>
      </footer>
    </Modal>
  );
}
