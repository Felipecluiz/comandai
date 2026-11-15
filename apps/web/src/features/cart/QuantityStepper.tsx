interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({ value, onChange, min = 0, max = 50 }: Props) {
  return (
    <div className="stepper" role="group" aria-label="Quantidade">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Diminuir">
        {value === 1 && min === 0 ? "🗑" : "−"}
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Aumentar" disabled={value >= max}>
        +
      </button>
    </div>
  );
}
