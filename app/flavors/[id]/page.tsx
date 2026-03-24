import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FlavorEditor } from "@/components/FlavorEditor";
import type { LlmModel, LlmInputType, LlmOutputType, HumorFlavorStepType } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FlavorPage({ params }: Props) {
  const { id } = await params;
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

  const { data: flavor } = await supabase
    .from("humor_flavors")
    .select("*")
    .eq("id", id)
    .single();

  if (!flavor) notFound();

  const { data: steps } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: true });

  const { data: captions } = await supabase
    .from("captions")
    .select("*, images(url, image_description)")
    .eq("humor_flavor_id", id)
    .order("created_datetime_utc", { ascending: false })
    .limit(20);

  // Get some test images (common use images)
  const { data: testImages } = await supabase
    .from("images")
    .select("id, url, image_description, is_common_use, is_public")
    .eq("is_common_use", true)
    .limit(10);

  const [
    { data: llmModels },
    { data: llmInputTypes },
    { data: llmOutputTypes },
    { data: stepTypes },
  ] = await Promise.all([
    supabase.from("llm_models").select("id, name").order("id"),
    supabase.from("llm_input_types").select("id, slug").order("id"),
    supabase.from("llm_output_types").select("id, slug").order("id"),
    supabase.from("humor_flavor_step_types").select("id, slug").order("id"),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar profile={profile} />
      <FlavorEditor
        flavor={flavor}
        initialSteps={steps || []}
        captions={captions || []}
        testImages={testImages || []}
        llmModels={(llmModels as LlmModel[]) || []}
        llmInputTypes={(llmInputTypes as LlmInputType[]) || []}
        llmOutputTypes={(llmOutputTypes as LlmOutputType[]) || []}
        stepTypes={(stepTypes as HumorFlavorStepType[]) || []}
      />
    </div>
  );
}