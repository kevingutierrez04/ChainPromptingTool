export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean;
  is_matrix_admin: boolean;
  created_datetime_utc: string;
  modified_datetime_utc: string;
}

export interface HumorFlavor {
  id: number;
  slug: string;
  description: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
}

export interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  description: string | null;
  created_by_user_id: string;
  modified_by_user_id: string;
  created_datetime_utc: string;
  modified_datetime_utc: string;
}

export interface LlmModel {
  id: number;
  name: string;
}

export interface LlmInputType {
  id: number;
  slug: string;
}

export interface LlmOutputType {
  id: number;
  slug: string;
}

export interface HumorFlavorStepType {
  id: number;
  slug: string;
}

export interface Caption {
  id: string;
  content: string | null;
  is_public: boolean;
  profile_id: string;
  image_id: string;
  humor_flavor_id: number | null;
  is_featured: boolean;
  like_count: number;
  created_datetime_utc: string;
  modified_datetime_utc: string;
  images?: Image;
}

export interface Image {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
  is_public: boolean | null;
}

export interface TestResult {
  captions: string[];
  image_url: string;
  flavor_id: number;
}