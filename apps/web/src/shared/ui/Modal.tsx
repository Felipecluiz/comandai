import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** <dialog> nativo: foco, Esc e backdrop acessíveis sem biblioteca. */
export function Modal({ title, open, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="modal-title">
      <header className="modal__header">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>
      {open && children}
    </dialog>
  );
}
