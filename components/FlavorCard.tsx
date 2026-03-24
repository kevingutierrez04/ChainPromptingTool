"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight } from "lucide-react";
import type { HumorFlavor } from "@/types";

interface FlavorCardProps {
  flavor: HumorFlavor;
}

export function FlavorCard({ flavor }: FlavorCardProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${flavor.slug}"? This will also delete all its steps.`)) return;

    const res = await fetch(`/api/flavors/${flavor.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to delete flavor");
    }
  };

  return (
    <Link
      href={`/flavors/${flavor.id}`}
      className="group relative flex flex-col gap-2 p-5 rounded-xl border border-border bg-card hover:border-foreground/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-semibold text-base leading-tight pr-8">{flavor.slug}</h2>
        <button
          onClick={handleDelete}
          className="absolute top-4 right-4 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
          title="Delete flavor"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {flavor.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{flavor.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-xs text-muted-foreground">
          {flavor.created_datetime_utc
            ? new Date(flavor.created_datetime_utc).toLocaleDateString()
            : ""}
        </span>
        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}