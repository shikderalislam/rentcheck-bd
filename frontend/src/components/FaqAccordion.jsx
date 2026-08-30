import { useState } from "react";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-4 text-left font-medium"
          >
            {item.q}
            <span className="text-xl leading-none">{openIndex === i ? "−" : "+"}</span>
          </button>
          {openIndex === i && <p className="pb-4 text-sm text-neutral-500">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}
