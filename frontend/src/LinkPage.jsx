// The plain, centred page that emailed links open onto: the logo, a heading,
// and whatever that page needs underneath.
function LinkPage({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto mb-5 h-20 w-20"
            draggable="false"
          />
          <h1 className="text-xl font-medium tracking-tight text-stone-800">{title}</h1>
        </div>

        {children}
      </div>
    </div>
  );
}

export default LinkPage;
