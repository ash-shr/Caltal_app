import { useState, useEffect, useRef } from 'react';

// "Ashutosh Sharma" -> "AS", "Lucki" -> "L"
function initialsOf(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join('');
}

function Profile({ user, onSignOut }) {
    const [open, setOpen] = useState(false);
    const container = useRef(null);

    // Close when clicking anywhere else, or on Escape — what every menu does.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event) => {
            if (container.current && !container.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={container} className="relative">
            <button
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-full
                           bg-stone-800 text-sm font-medium text-white
                           transition-all duration-200 hover:bg-stone-700 active:scale-95"
            >
                {initialsOf(user.name)}
            </button>

            <div
                className={
                    'absolute right-0 top-12 z-30 w-60 origin-top-right rounded-2xl border ' +
                    'border-stone-200 bg-white p-1 shadow-lg transition-all duration-200 ' +
                    (open
                        ? 'scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0')
                }
            >
                <div className="px-3 py-3">
                    <p className="text-sm font-medium text-stone-800">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">{user.email}</p>
                </div>

                <div className="my-1 h-px bg-stone-100" />

                <button
                    type="button"
                    onClick={() => {
                        setOpen(false);
                        onSignOut();
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-600
                               transition-colors duration-200 hover:bg-stone-50 hover:text-stone-900"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}

export default Profile;
