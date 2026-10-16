// Classes shared by the sign-in screen and the pages emailed links open.

export const inputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm ' +
  'text-stone-800 placeholder:text-stone-400 transition-colors duration-200 ' +
  'focus:border-stone-400 focus:outline-none';

export const buttonClass =
  'w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white ' +
  'transition-all duration-200 hover:bg-stone-700 active:scale-[0.98] ' +
  'disabled:opacity-50';

export const secondaryButtonClass =
  'w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium ' +
  'text-stone-700 transition-all duration-200 hover:bg-stone-50 active:scale-[0.98] ' +
  'disabled:opacity-50';

export const linkButtonClass =
  'text-stone-800 underline underline-offset-2 transition-colors hover:text-stone-600';

export const quietDangerButtonClass =
  'w-full rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors ' +
  'hover:bg-red-50 active:scale-[0.98] disabled:opacity-50';

export const dangerButtonClass =
  'w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white ' +
  'transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50';

// A small heading over a group of things in the panel or on a page
export const sectionTitleClass = 'text-xs font-semibold uppercase tracking-widest text-stone-400';
