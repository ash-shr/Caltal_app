// The thumb and track are styled with arbitrary variants because a range input
// exposes them only as vendor pseudo-elements; there is no Tailwind class for
// them.
const SLIDER =
  'h-9 w-full cursor-pointer appearance-none bg-transparent ' +
  '[&::-webkit-slider-runnable-track]:h-1 ' +
  '[&::-webkit-slider-runnable-track]:rounded-full ' +
  '[&::-webkit-slider-runnable-track]:bg-stone-200 ' +
  '[&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:-mt-1.5 ' +
  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 ' +
  '[&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-stone-800 ' +
  '[&::-webkit-slider-thumb]:shadow-sm ' +
  '[&::-webkit-slider-thumb]:transition-transform ' +
  '[&::-webkit-slider-thumb]:hover:scale-110 ' +
  '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full ' +
  '[&::-moz-range-track]:bg-stone-200 ' +
  '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 ' +
  '[&::-moz-range-thumb]:bg-stone-800';

// A plain controlled input: every movement updates the parent, so the circle on
// the map follows the slider immediately.
function RadiusSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-stone-500">{label}</span>
        <span className="text-xs tabular-nums text-stone-500">{value}m</span>
      </div>

      <input
        type="range"
        min="50"
        max="2000"
        step="10"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={SLIDER}
      />
    </div>
  );
}

export default RadiusSlider;
