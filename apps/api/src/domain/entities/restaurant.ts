import { ValidationError } from "../errors/domain-error";
import { DEFAULT_TIME_ZONE } from "../value-objects/local-date";
import { Money } from "../value-objects/money";
import { Phone } from "../value-objects/phone";
import { Slug } from "../value-objects/slug";
import { boundedText } from "../value-objects/text";

export interface RestaurantSettings {
  deliveryFeeCents: number;
  minOrderCents: number;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  isOpen: boolean;
}

export interface RestaurantSnapshot extends RestaurantSettings {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  timeZone: string;
  createdAt: string;
}

export type RestaurantChanges = Partial<RestaurantSettings & { name: string; whatsapp: string }>;

const DEFAULT_SETTINGS: RestaurantSettings = {
  deliveryFeeCents: 0,
  minOrderCents: 0,
  acceptsDelivery: true,
  acceptsPickup: true,
  isOpen: false, // abre só depois de montar o cardápio
};

export class Restaurant {
  private constructor(private state: RestaurantSnapshot) {}

  static create(props: { id: string; name: string; slug: string; whatsapp: string }, now: Date): Restaurant {
    return new Restaurant(
      Restaurant.validate({
        ...DEFAULT_SETTINGS,
        id: props.id,
        name: props.name,
        slug: Slug.create(props.slug).value,
        whatsapp: props.whatsapp,
        timeZone: DEFAULT_TIME_ZONE,
        createdAt: now.toISOString(),
      }),
    );
  }

  static restore(snapshot: RestaurantSnapshot): Restaurant {
    return new Restaurant({ ...snapshot });
  }

  get id(): string {
    return this.state.id;
  }
  get name(): string {
    return this.state.name;
  }
  get whatsapp(): Phone {
    return Phone.restore(this.state.whatsapp);
  }
  get timeZone(): string {
    return this.state.timeZone;
  }
  get isOpen(): boolean {
    return this.state.isOpen;
  }
  get deliveryFee(): Money {
    return Money.of(this.state.deliveryFeeCents);
  }
  get minOrder(): Money {
    return Money.of(this.state.minOrderCents);
  }

  accepts(fulfillment: "delivery" | "pickup"): boolean {
    return fulfillment === "delivery" ? this.state.acceptsDelivery : this.state.acceptsPickup;
  }

  update(changes: RestaurantChanges): void {
    this.state = Restaurant.validate({ ...this.state, ...changes });
  }

  toSnapshot(): RestaurantSnapshot {
    return { ...this.state };
  }

  private static validate(s: RestaurantSnapshot): RestaurantSnapshot {
    if (!s.acceptsDelivery && !s.acceptsPickup) {
      throw new ValidationError("acceptsDelivery", "Habilite entrega ou retirada"); // BR-001.5
    }
    return {
      ...s,
      name: boundedText(s.name, { field: "name", min: 2, max: 60 }),
      whatsapp: Phone.create(s.whatsapp, "whatsapp", { mobileOnly: true }).digits,
      deliveryFeeCents: Money.of(s.deliveryFeeCents, "deliveryFeeCents").cents,
      minOrderCents: Money.of(s.minOrderCents, "minOrderCents").cents,
    };
  }
}
