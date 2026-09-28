// Full-screen launch state. Shown while the app works out whether anyone is
// signed in, and again while a sign-in is in flight — which on a cold Fly
// machine can take fifteen seconds or so.
function Splash({ label, visible = true }) {
    return (
        <div
            className={
                'fixed inset-0 z-[100] flex flex-col items-center justify-center ' +
                'bg-stone-50 transition-opacity duration-500 ' +
                (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
            }
        >
            <img
                src="/peeling.webp"
                alt=""
                className="w-64 select-none sm:w-80"
                draggable="false"
            />

            <p className="mt-8 text-xl font-medium tracking-tight text-stone-800">
                Caltal
            </p>

            <p className="mt-1 h-4 text-xs text-stone-400">{label}</p>
        </div>
    );
}

export default Splash;
