export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-20">
      <div className="container-page py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-extrabold text-lg mb-2">RentCheck <span className="text-brand-600">BD</span></div>
          <p className="text-neutral-500 max-w-xs">বাসা নেওয়ার আগে জানুন। Real tenant experiences and verified reviews to help you make a smarter rental decision.</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Platform</div>
          <ul className="space-y-1 text-neutral-500">
            <li>How it works</li>
            <li>Trust & safety</li>
            <li>For landlords</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Legal</div>
          <ul className="space-y-1 text-neutral-500">
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
            <li>Community Guidelines</li>
          </ul>
        </div>
      </div>
      <div className="container-page py-6 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400">
        © {new Date().getFullYear()} RentCheck BD. Reviews represent individual users' experiences.
      </div>
    </footer>
  );
}
