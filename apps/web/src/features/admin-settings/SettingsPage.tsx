import type { RestaurantDto, UpdateRestaurantInput } from "@comandai/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { adminApi } from "../../shared/api/http";
import { centsToInput, formatPhoneDigits, maskPhone, parseBRLToCents } from "../../shared/lib/format";
import { ErrorMessage, Field, fieldError, hasFieldErrors } from "../../shared/ui/feedback";
import { updateSessionRestaurant, useSession } from "../auth/session";

export function SettingsPage() {
  const restaurant = useSession()!.restaurant;
  const [form, setForm] = useState({
    name: restaurant.name,
    whatsapp: formatPhoneDigits(restaurant.whatsapp),
    deliveryFee: centsToInput(restaurant.deliveryFeeCents),
    minOrder: centsToInput(restaurant.minOrderCents),
    acceptsDelivery: restaurant.acceptsDelivery,
    acceptsPickup: restaurant.acceptsPickup,
  });
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (input: UpdateRestaurantInput) => adminApi.patch<RestaurantDto>("/restaurant", input),
    onSuccess: (r) => {
      updateSessionRestaurant(r);
      setSaved(true);
    },
  });
  const err = (field: string) => fieldError(save.error, field);
  const menuUrl = `${location.origin}/r/${restaurant.slug}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    save.mutate({
      name: form.name,
      whatsapp: form.whatsapp,
      deliveryFeeCents: parseBRLToCents(form.deliveryFee) ?? 0,
      minOrderCents: parseBRLToCents(form.minOrder) ?? 0,
      acceptsDelivery: form.acceptsDelivery,
      acceptsPickup: form.acceptsPickup,
    });
  };

  return (
    <section className="narrow">
      <header className="page-header">
        <h1>Configurações</h1>
      </header>

      <div className="card share">
        <div className="grow">
          <h2 className="card__title">Link do seu cardápio</h2>
          <code>{menuUrl}</code>
        </div>
        <button className="btn" onClick={() => navigator.clipboard?.writeText(menuUrl)}>
          Copiar
        </button>
      </div>

      <form className="card form" onSubmit={submit} noValidate>
        <Field label="Nome do restaurante" error={err("name")}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="WhatsApp que recebe os pedidos" error={err("whatsapp")}>
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} inputMode="tel" />
        </Field>
        <div className="grid-2">
          <Field label="Taxa de entrega (R$)" error={err("deliveryFeeCents")}>
            <input value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Pedido mínimo (R$)" error={err("minOrderCents")}>
            <input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} inputMode="decimal" />
          </Field>
        </div>
        <label className="switch">
          <input type="checkbox" checked={form.acceptsDelivery} onChange={(e) => setForm({ ...form, acceptsDelivery: e.target.checked })} />
          <span>Faço entregas</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={form.acceptsPickup} onChange={(e) => setForm({ ...form, acceptsPickup: e.target.checked })} />
          <span>Aceito retirada no local</span>
        </label>
        {err("acceptsDelivery") && <small className="field__error">{err("acceptsDelivery")}</small>}

        {save.error && !hasFieldErrors(save.error) && <ErrorMessage error={save.error} />}
        {saved && <p className="success">Configurações salvas ✓</p>}

        <footer className="form__actions">
          <button className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </section>
  );
}
