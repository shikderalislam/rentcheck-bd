import { useMemo, useState } from "react";

export default function RentCalculator() {
  const [rent, setRent] = useState(18000);
  const [advanceMonths, setAdvanceMonths] = useState(2);
  const [serviceCharge, setServiceCharge] = useState(500);
  const [otherCosts, setOtherCosts] = useState(2000);

  const advance = useMemo(() => rent * advanceMonths, [rent, advanceMonths]);
  const total = useMemo(
    () => advance + rent + Number(serviceCharge || 0) + Number(otherCosts || 0),
    [advance, rent, serviceCharge, otherCosts]
  );

  const field = (label, value, setter, step = 500) => (
    <div>
      <label className="text-sm text-neutral-500">{label}</label>
      <div className="mt-1 flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <input
          type="number"
          className="w-full px-4 py-2.5 text-sm bg-transparent focus:outline-none"
          value={value}
          step={step}
          onChange={(e) => setter(Number(e.target.value) || 0)}
        />
        <span className="px-3 text-sm text-neutral-400 border-l border-neutral-200 dark:border-neutral-700">৳</span>
      </div>
    </div>
  );

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-lg">ভাড়া শুধু মাসিক টাকার হিসাব নয়</h3>
      <p className="text-sm text-neutral-500 mt-1 mb-5">মোট খরচ আগে থেকেই জেনে নিন।</p>

      <div className="grid grid-cols-2 gap-4">
        {field("মাসিক ভাড়া", rent, setRent)}
        <div>
          <label className="text-sm text-neutral-500">অগ্রিম (মাস)</label>
          <input
            type="number"
            min={0}
            max={12}
            className="input mt-1"
            value={advanceMonths}
            onChange={(e) => setAdvanceMonths(Number(e.target.value) || 0)}
          />
        </div>
        {field("সার্ভিস চার্জ (মাসিক)", serviceCharge, setServiceCharge, 50)}
        {field("অন্যান্য আনুষঙ্গিক খরচ", otherCosts, setOtherCosts, 500)}
      </div>

      <div className="mt-6 rounded-xl bg-brand-50 dark:bg-brand-900/20 p-4">
        <p className="text-sm text-neutral-500">প্রথম মাসে মোট খরচ</p>
        <p className="text-3xl font-extrabold text-brand-700">৳{total.toLocaleString()}</p>
        <dl className="mt-3 space-y-1 text-sm text-neutral-500">
          <div className="flex justify-between"><dt>অগ্রিম</dt><dd>৳{advance.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>প্রথম মাসের ভাড়া</dt><dd>৳{rent.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>সার্ভিস চার্জ</dt><dd>৳{Number(serviceCharge).toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>অন্যান্য</dt><dd>৳{Number(otherCosts).toLocaleString()}</dd></div>
        </dl>
      </div>
    </div>
  );
}
