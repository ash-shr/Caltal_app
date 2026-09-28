// The peeling orange, used wherever the app is waiting. Deliberately the same
// artwork as the icon, so a slow moment still looks like the product.
function Loading({ label, size = 64 }) {
    return (
        <div className="flex flex-col items-center gap-3 py-6">
            <img
                src="/peeling.webp"
                alt=""
                width={size}
                height={size}
                style={{ width: size, height: 'auto' }}
                className="rounded-xl"
            />
            {label && <p className="text-xs text-stone-400">{label}</p>}
        </div>
    );
}

export default Loading;
