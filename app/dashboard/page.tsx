import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FlavorCard } from "@/components/FlavorCard";
import { CreateFlavorButton } from "@/components/CreateFlavorButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
    redirect("/login?error=unauthorized");
  }

  const { data: flavors } = await supabase
    .from("humor_flavors")
    .select("*")
    .order("created_datetime_utc", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <Navbar profile={profile} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Humor Flavors</h1>
            <p className="text-muted-foreground mt-1">
              Manage prompt chains for caption generation
            </p>
          </div>
          <CreateFlavorButton />
        </div>

        {flavors && flavors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flavors.map((flavor) => (
              <FlavorCard key={flavor.id} flavor={flavor} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🌶️</div>
            <h2 className="text-xl font-semibold mb-2">No humor flavors yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first humor flavor to start building prompt chains
            </p>
            <CreateFlavorButton />
          </div>
        )}
      </main>
    </div>
  );
}