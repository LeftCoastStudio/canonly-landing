import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/claims", label: "Claim Library" },
  { href: "/blocks", label: "Answer Blocks" },
  { href: "/review", label: "Review Queue" },
  { href: "/pages", label: "Pages" },
  { href: "/citations", label: "Citations" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-white">
        <div className="px-5 py-6 font-serif text-xl font-bold tracking-widest">
          CANONLY<span className="text-mint">.</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-ice hover:bg-white/10 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-ice">
          <div className="font-semibold text-white">{session.name}</div>
          <div className="mb-2 capitalize">{session.role}</div>
          <form method="POST" action="/api/logout">
            <button className="text-ice underline hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
