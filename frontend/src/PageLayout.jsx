import { useEffect } from 'react';
import Icon from './icons';
import { navigate } from './router';

// A full page laid over the map (Settings, Saved places, Terms). The map
// stays loaded underneath, so going back to it is instant and it's still
// where it was left. Escape goes back too.
function PageLayout({ title, children }) {
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape' && !event.defaultPrevented) navigate('/');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-stone-50">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-6 sm:pt-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="-ml-1 mb-6 flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-800"
        >
          <Icon name="back" size={16} />
          Back to the map
        </button>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-stone-800">{title}</h1>

        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}

// A titled white card on a page
export function Section({ title, tone, children }) {
  return (
    <section className="space-y-2">
      <h2
        className={
          'px-1 text-xs font-semibold uppercase tracking-widest ' +
          (tone === 'danger' ? 'text-red-600' : 'text-stone-400')
        }
      >
        {title}
      </h2>
      <div
        className={
          'space-y-3 rounded-2xl p-5 ring-1 ' +
          (tone === 'danger' ? 'bg-red-50/60 ring-red-200' : 'bg-white ring-stone-200')
        }
      >
        {children}
      </div>
    </section>
  );
}

export default PageLayout;
