"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Profile } from "@/types";

interface NavbarProps {
  profile: Profile;
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-bold text-lg tracking-tight hover:opacity-70 transition-opacity flex items-center gap-2"
        >
          <span>😂</span>
          <span>Humor Flavor Tool</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {profile.email}
          </span>
          {(profile.is_superadmin || profile.is_matrix_admin) && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
              {profile.is_superadmin ? "Superadmin" : "Matrix Admin"}
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}