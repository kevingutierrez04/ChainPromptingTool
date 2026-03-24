import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  if (!llm_model_id || !llm_input_type_id || !llm_output_type_id || !humor_flavor_step_type_id) {
    return NextResponse.json({ error: "llm_model_id, llm_input_type_id, llm_output_type_id, and humor_flavor_step_type_id are required" }, { status: 400 });
  }

  // Get current max order_by
  const { data: existing } = await supabase
    .from("humor_flavor_steps")
    .select("order_by")
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_by + 1 : 1;

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: parseInt(id),
      order_by: nextOrder,
      llm_system_prompt: llm_system_prompt?.trim() || null,
      llm_user_prompt: llm_user_prompt?.trim() || null,
      description: description?.trim() || null,
      llm_model_id,
      llm_input_type_id,
      llm_output_type_id,
      humor_flavor_step_type_id,
      created_by_user_id: user.id,
      modified_by_user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
