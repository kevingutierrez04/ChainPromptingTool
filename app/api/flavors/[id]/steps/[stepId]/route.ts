import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    llm_system_prompt,
    llm_user_prompt,
    description,
    llm_model_id,
    llm_input_type_id,
    llm_output_type_id,
    humor_flavor_step_type_id,
  } = body;

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .update({
      llm_system_prompt: llm_system_prompt?.trim() || null,
      llm_user_prompt: llm_user_prompt?.trim() || null,
      description: description?.trim() || null,
      ...(llm_model_id !== undefined && { llm_model_id }),
      ...(llm_input_type_id !== undefined && { llm_input_type_id }),
      ...(llm_output_type_id !== undefined && { llm_output_type_id }),
      ...(humor_flavor_step_type_id !== undefined && { humor_flavor_step_type_id }),
      modified_by_user_id: user.id,
      modified_datetime_utc: new Date().toISOString(),
    })
    .eq("id", stepId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("id", stepId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-number remaining steps
  const { data: remaining } = await supabase
    .from("humor_flavor_steps")
    .select("id")
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: true });

  if (remaining) {
    await Promise.all(
      remaining.map((step, index) =>
        supabase
          .from("humor_flavor_steps")
          .update({ order_by: index + 1 })
          .eq("id", step.id)
      )
    );
  }

  return NextResponse.json({ success: true });
}
