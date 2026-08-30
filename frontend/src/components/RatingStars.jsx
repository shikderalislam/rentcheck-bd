export default function RatingStars({ value = 0, size = "text-sm", showValue = true }) {
  const rounded = Math.round(value * 2) / 2;
  const stars = [1, 2, 3, 4, 5];

  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="flex text-amber-500">
        {stars.map((s) => (
          <span key={s}>{rounded >= s ? "★" : rounded >= s - 0.5 ? "⯨" : "☆"}</span>
        ))}
      </span>
      {showValue && <span className="font-semibold text-neutral-700 dark:text-neutral-200">{value.toFixed(1)}</span>}
    </span>
  );
}
