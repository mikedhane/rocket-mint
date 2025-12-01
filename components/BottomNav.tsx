"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Rocket, Wallet, Gift, TrendingUp } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur z-50 safe-area-inset-bottom">
      <div className="mx-auto max-w-md px-4 sm:px-6 py-3 pb-safe">
        <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1">
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center gap-1 py-1 transition min-w-0 ${
              isActive("/") ? "text-violet-500" : "text-zinc-400 hover:text-violet-500"
            }`}
          >
            <Home className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className={`truncate w-full text-center ${isActive("/") ? "font-semibold" : "font-medium"}`}>Home</span>
          </Link>

          <Link
            href="/launch"
            className={`flex-1 flex flex-col items-center gap-1 py-1 transition min-w-0 ${
              isActive("/launch") ? "text-violet-500" : "text-zinc-400 hover:text-violet-500"
            }`}
          >
            <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className={`truncate w-full text-center ${isActive("/launch") ? "font-semibold" : "font-medium"}`}>Create</span>
          </Link>

          <Link
            href="/marketplace"
            className={`flex-1 flex flex-col items-center gap-1 py-1 transition min-w-0 ${
              isActive("/marketplace") ? "text-violet-500" : "text-zinc-400 hover:text-violet-500"
            }`}
          >
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className={`truncate w-full text-center ${isActive("/marketplace") ? "font-semibold" : "font-medium"}`}>Market</span>
          </Link>

          <Link
            href="/referrals"
            className={`flex-1 flex flex-col items-center gap-1 py-1 transition min-w-0 ${
              isActive("/referrals") ? "text-violet-500" : "text-zinc-400 hover:text-violet-500"
            }`}
          >
            <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className={`truncate w-full text-center ${isActive("/referrals") ? "font-semibold" : "font-medium"}`}>Rewards</span>
          </Link>

          <Link
            href="/holdings"
            className={`flex-1 flex flex-col items-center gap-1 py-1 transition min-w-0 ${
              isActive("/holdings") ? "text-violet-500" : "text-zinc-400 hover:text-violet-500"
            }`}
          >
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className={`truncate w-full text-center ${isActive("/holdings") ? "font-semibold" : "font-medium"}`}>Holdings</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
