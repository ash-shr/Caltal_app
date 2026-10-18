import { useState, useEffect, useRef } from 'react';
import { getMe, sendConfirmationEmail } from './api';
import { navigate } from './router';

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

    // Whether the email address is confirmed, checked each time the menu opens
    const [emailConfirmed, setEmailConfirmed] = useState(true);
    const [sendState, setSendState] = useState({ status: 'idle', message: '' });

    useEffect(() => {
        if (!open) return;

        getMe()
            .then(me => setEmailConfirmed(me.emailVerified))
            .catch(() => {
                // Not worth interrupting the menu for; it just won't offer the link
            });
    }, [open]);

    const sendLink = () => {
        setSendState({ status: 'sending', message: '' });
        sendConfirmationEmail()
            .then(() => setSendState({ status: 'sent', message: 'Sent. Open the link in the email.' }))
            .catch(err => setSendState({ status: 'failed', message: err.message }));
    };

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
                className="flex h-12 w-12 items-center justify-center rounded-full
                           bg-stone-800 text-sm font-medium text-white shadow-lg ring-2 ring-white
                           transition-all duration-200 hover:bg-stone-700 active:scale-95"
            >
                {initialsOf(user.name)}
            </button>

            <div
                className={
                    'absolute right-0 top-14 z-40 w-64 origin-top-right rounded-2xl border ' +
                    'border-stone-200 bg-white p-1 shadow-lg transition-all duration-200 ' +
                    (open
                        ? 'scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0')
                }
            >
                <div className="px-3 py-3">
                    <p className="text-sm font-medium text-stone-800">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">{user.email}</p>

                    {!emailConfirmed && (
                        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <p className="font-medium">Email not confirmed yet</p>
                            {sendState.status === 'sent' || sendState.status === 'failed' ? (
                                <p className="mt-1">{sendState.message}</p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={sendLink}
                                    disabled={sendState.status === 'sending'}
                                    className="mt-1 underline underline-offset-2 disabled:opacity-50"
                                >
                                    {sendState.status === 'sending' ? 'Sending…' : 'Send confirmation link'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="my-1 h-px bg-stone-100" />

                {[
                    ['/places', 'Saved places'],
                    ['/settings', 'Settings'],
                    ['/terms', 'Terms'],
                    ['/privacy', 'Privacy'],
                ].map(([path, label]) => (
                    <button
                        key={path}
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate(path);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-600
                                   transition-colors duration-200 hover:bg-stone-50 hover:text-stone-900"
                    >
                        {label}
                    </button>
                ))}

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
