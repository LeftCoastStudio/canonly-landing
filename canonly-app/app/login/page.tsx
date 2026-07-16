export default function Login({ searchParams }: { searchParams: { err?: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="font-serif text-4xl font-bold tracking-widest text-white">
            CANONLY<span className="text-mint">.</span>
          </div>
          <p className="mt-2 text-sm text-ice">Review once. Compose freely. Get cited.</p>
        </div>
        <form method="POST" action="/api/login" className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="you@company.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="input" placeholder="••••••••" />
          </div>
          {searchParams.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Invalid email or password.</p>
          )}
          <button className="btn w-full justify-center" type="submit">Sign in</button>
          <div className="rounded-lg bg-tint px-3 py-2 text-xs leading-relaxed text-navy/70">
            <b>Demo logins</b> (password: <code>canonly-demo</code>)<br />
            jason@leftcoastagency.com — admin<br />
            marketing@meridian.demo — marketing<br />
            legal@meridian.demo — legal/compliance
          </div>
        </form>
      </div>
    </div>
  );
}
