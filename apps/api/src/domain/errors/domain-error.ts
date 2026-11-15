export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "SLUG_TAKEN"
  | "EMAIL_TAKEN"
  | "CATEGORY_NAME_TAKEN"
  | "CATEGORY_NOT_EMPTY"
  | "INVALID_IMAGE"
  | "RESTAURANT_CLOSED"
  | "PRODUCT_UNAVAILABLE"
  | "MIN_ORDER_NOT_REACHED"
  | "INVALID_STATUS_TRANSITION";

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(resource: string) {
    super(`${resource} não encontrado(a)`);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  constructor() {
    super("Sessão inválida ou expirada");
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";
  constructor() {
    super("E-mail ou senha incorretos");
  }
}

export class SlugTakenError extends DomainError {
  readonly code = "SLUG_TAKEN";
  constructor(slug: string) {
    super(`O endereço "${slug}" já está em uso`);
  }
}

export class EmailTakenError extends DomainError {
  readonly code = "EMAIL_TAKEN";
  constructor() {
    super("Este e-mail já possui cadastro");
  }
}

export class CategoryNameTakenError extends DomainError {
  readonly code = "CATEGORY_NAME_TAKEN";
  constructor(name: string) {
    super(`Já existe a categoria "${name}"`);
  }
}

export class CategoryNotEmptyError extends DomainError {
  readonly code = "CATEGORY_NOT_EMPTY";
  constructor() {
    super("Mova ou exclua os produtos antes de excluir a categoria");
  }
}

export class InvalidImageError extends DomainError {
  readonly code = "INVALID_IMAGE";
}

export class RestaurantClosedError extends DomainError {
  readonly code = "RESTAURANT_CLOSED";
  constructor() {
    super("O restaurante está fechado no momento");
  }
}

export class ProductUnavailableError extends DomainError {
  readonly code = "PRODUCT_UNAVAILABLE";
  constructor(readonly productId: string) {
    super("Um dos produtos do carrinho não está mais disponível");
  }
}

export class MinOrderNotReachedError extends DomainError {
  readonly code = "MIN_ORDER_NOT_REACHED";
  constructor(readonly minOrderCents: number) {
    super("O pedido não atingiu o valor mínimo");
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = "INVALID_STATUS_TRANSITION";
  constructor(from: string, to: string) {
    super(`Não é possível mudar o pedido de "${from}" para "${to}"`);
  }
}
