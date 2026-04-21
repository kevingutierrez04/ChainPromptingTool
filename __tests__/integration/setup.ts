import { createClient } from "@supabase/supabase-js";

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/** Returns the ID of any superadmin in the profiles table. */
export async function getTestUserId(): Promise<string> {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id")
    .eq("is_superadmin", true)
    .limit(1)
    .single();

  if (error || !data) throw new Error(`No superadmin profile found: ${error?.message}`);
  return data.id;
}

/** Returns one valid ID from each reference table needed to create a step. */
export async function getRefIds() {
  const [model, inputType, outputType, stepType] = await Promise.all([
    adminClient.from("llm_models").select("id").limit(1).single(),
    adminClient.from("llm_input_types").select("id").limit(1).single(),
    adminClient.from("llm_output_types").select("id").limit(1).single(),
    adminClient.from("humor_flavor_step_types").select("id").limit(1).single(),
  ]);

  if (!model.data || !inputType.data || !outputType.data || !stepType.data) {
    throw new Error("Reference tables are empty — seed the DB before running integration tests.");
  }

  return {
    llm_model_id: model.data.id as number,
    llm_input_type_id: inputType.data.id as number,
    llm_output_type_id: outputType.data.id as number,
    humor_flavor_step_type_id: stepType.data.id as number,
  };
}
