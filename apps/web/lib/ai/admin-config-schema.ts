import { z } from "zod";

export const aiPlanKeySchema = z.enum(["free", "basic", "pro"]);

export const aiProviderAdapterSchema = z.enum([
  "anthropic",
  "openai",
  "deepseek",
  "openai_compatible",
]);

export const aiModelCapabilitySchema = z.enum([
  "generation",
  "chat",
  "analysis",
  "embedding",
]);

export const aiModelLifecycleSchema = z.enum([
  "candidate",
  "active",
  "deprecated",
]);

export const aiModelCostTierSchema = z.enum(["low", "medium", "high", "premium"]);
export const aiModelSpeedTierSchema = z.enum(["fast", "standard", "slow"]);
export const aiModelQualityTierSchema = z.enum(["standard", "strong", "premium"]);
export const aiModelContextTierSchema = z.enum(["short", "medium", "long", "very_long"]);

export const aiProviderChannelCostTierSchema = z.enum([
  "free",
  "cheap",
  "medium",
  "official",
  "expensive",
]);
export const aiProviderChannelTrustTierSchema = z.enum([
  "official",
  "trusted_relay",
  "relay",
  "experimental",
]);

export const aiEntitlementAccessSchema = z.enum([
  "default_allowed",
  "allowed",
  "restricted",
  "hidden",
]);

const optionalTextSchema = z
  .string()
  .trim()
  .max(1000)
  .nullable()
  .optional()
  .transform((value) => value || null);

const optionalSecretSchema = z
  .string()
  .trim()
  .max(20_000)
  .nullable()
  .optional()
  .transform((value) => value || null);

const envVarSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]*$/, "环境变量名必须使用大写字母、数字和下划线");

const idSchema = z.string().uuid();

const rawSecretKeySchema = z
  .object({
    apiKey: z.never().optional(),
    secret: z.never().optional(),
    token: z.never().optional(),
  })
  .passthrough();

export function assertNoRawSecretFields(value: unknown) {
  const parsed = rawSecretKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Provider 密钥请使用后台 Key 字段保存，或只配置环境变量名。");
  }
}

export const providerUpsertSchema = z.object({
  id: idSchema.optional(),
  provider_key: z.string().trim().min(1).max(80),
  display_name: z.string().trim().min(1).max(120),
  adapter_type: aiProviderAdapterSchema,
  base_url: z.string().trim().url().nullable().optional(),
  api_key_env_var: envVarSchema,
  api_key_pool_env_var: envVarSchema.nullable().optional(),
  data_policy_label: z.string().trim().min(1).max(200).optional(),
  allows_user_content: z.boolean().optional(),
  retention_policy_url: z.string().trim().url().nullable().optional(),
  training_opt_out: z.boolean().optional(),
  operator_notes: optionalTextSchema,
  is_enabled: z.boolean().optional(),
}).strict();

export const providerChannelUpsertSchema = z.object({
  id: idSchema.optional(),
  channel_key: z.string().trim().min(1).max(80),
  display_name: z.string().trim().min(1).max(120),
  adapter_type: aiProviderAdapterSchema.default("openai_compatible"),
  base_url: z.string().trim().url().nullable().optional(),
  api_key_env_var: envVarSchema,
  api_key_pool_env_var: envVarSchema.nullable().optional(),
  stored_api_key: optionalSecretSchema,
  stored_api_key_pool: optionalSecretSchema,
  clear_stored_api_key: z.boolean().optional(),
  clear_stored_api_key_pool: z.boolean().optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  cost_tier: aiProviderChannelCostTierSchema.optional(),
  trust_tier: aiProviderChannelTrustTierSchema.optional(),
  data_policy_label: z.string().trim().min(1).max(200).optional(),
  allows_user_content: z.boolean().optional(),
  training_opt_out: z.boolean().optional(),
  retention_policy_url: z.string().trim().url().nullable().optional(),
  timeout_ms: z.number().int().min(1000).max(120_000).optional(),
  max_retries: z.number().int().min(0).max(5).optional(),
  is_enabled: z.boolean().optional(),
  operator_notes: optionalTextSchema,
}).strict();

export const modelChannelMappingUpsertSchema = z.object({
  id: idSchema.optional(),
  model_id: idSchema,
  channel_id: idSchema,
  upstream_model_id: z.string().trim().min(1).max(240),
  priority: z.number().int().min(0).max(10_000).optional(),
  is_enabled: z.boolean().optional(),
}).strict();

export const modelUpsertSchema = z.object({
  id: idSchema.optional(),
  provider_id: idSchema.optional(),
  default_channel_id: idSchema.optional(),
  default_upstream_model_id: z.string().trim().min(1).max(240).optional(),
  model_alias: z.string().trim().min(1).max(120),
  model_id: z.string().trim().min(1).max(240),
  display_name: z.string().trim().min(1).max(160),
  capabilities: z.array(aiModelCapabilitySchema).min(1),
  context_window: z.number().int().positive().nullable().optional(),
  notes: optionalTextSchema,
  lifecycle_state: aiModelLifecycleSchema.optional(),
  cost_tier: aiModelCostTierSchema.optional(),
  speed_tier: aiModelSpeedTierSchema.optional(),
  quality_tier: aiModelQualityTierSchema.optional(),
  context_tier: aiModelContextTierSchema.optional(),
  structured_output: z.boolean().optional(),
  chinese_writing_score: z.number().int().min(1).max(5).optional(),
  operator_tags: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
  is_enabled: z.boolean().optional(),
}).strict().refine((value) => value.provider_id || value.default_channel_id, {
  message: "请选择默认调用来源",
}).refine((value) => !value.default_channel_id || value.default_upstream_model_id, {
  message: "请填写来源模型 ID",
});

export const planUpdateSchema = z.object({
  plan_key: aiPlanKeySchema,
  display_name: z.string().trim().min(1).max(120),
  description: optionalTextSchema,
  monthly_credits: z.number().int().min(0).max(1_000_000),
  tier_rank: z.number().int().min(0).max(1000),
  highlight_features: z.array(z.string().trim().min(1).max(80)).max(12),
  is_enabled: z.boolean().optional(),
}).strict();

export const entitlementUpsertSchema = z.object({
  id: idSchema.optional(),
  plan_key: aiPlanKeySchema,
  model_id: idSchema,
  access_level: aiEntitlementAccessSchema,
  feature_label: optionalTextSchema,
  is_enabled: z.boolean().optional(),
}).strict();

export const aiCreditChargeBehaviorSchema = z.enum([
  "explicit",
  "system_free",
  "disabled",
]);

export const aiCreditPriceTierSchema = z.enum([
  "standard",
  "stable",
  "premium",
  "opus",
]);

export const aiCreditContextTierSchema = z.enum([
  "short",
  "standard",
  "long",
  "extra_long",
]);

export const aiRouteFallbackModeSchema = z.enum([
  "none",
  "first_token_only",
  "retry_then_fallback",
]);

export const routeUpsertSchema = z.object({
  id: idSchema.optional(),
  route_key: z.string().trim().min(1).max(120),
  plan: aiPlanKeySchema.nullable(),
  capability: aiModelCapabilitySchema,
  model_id: idSchema,
  fallback_model_id: idSchema.nullable().optional(),
  allow_paid_fallback: z.boolean().optional(),
  fallback_mode: aiRouteFallbackModeSchema.optional(),
  primary_timeout_ms: z.number().int().min(1000).max(120_000).optional(),
  fallback_timeout_ms: z.number().int().min(1000).max(120_000).optional(),
  max_attempts: z.number().int().min(0).max(5).optional(),
  fallback_price_tier: aiCreditPriceTierSchema.nullable().optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  is_enabled: z.boolean().optional(),
}).strict();

export const creditPolicyUpsertSchema = z.object({
  id: idSchema.optional(),
  route_key: z.string().trim().min(1).max(120),
  plan: aiPlanKeySchema.nullable(),
  price_tier: aiCreditPriceTierSchema.optional().default("standard"),
  context_tier: aiCreditContextTierSchema.optional().default("standard"),
  credits_cost: z.number().int().min(0).max(10_000).optional(),
  base_credits: z.number().int().min(0).max(10_000),
  pro_provider_surcharge: z.number().int().min(0).max(10_000),
  enhanced_context_surcharge: z.number().int().min(0).max(10_000),
  always_long_context: z.boolean().optional(),
  charge_behavior: aiCreditChargeBehaviorSchema,
  display_label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional().transform((value) => value || null),
  is_enabled: z.boolean().optional(),
}).strict();

export const toggleSchema = z.object({
  resource: z.enum(["provider", "model", "route", "entitlement", "plan"]),
  id: z.string().min(1),
  isEnabled: z.boolean(),
});

export const resolvePreviewSchema = z.object({
  routeKey: z.string().trim().min(1).max(120),
  plan: aiPlanKeySchema.nullable(),
  capability: aiModelCapabilitySchema,
  callScope: z.enum(["user_plan_scoped", "internal_system"]).default("user_plan_scoped"),
  resolutionMode: z.enum(["compatibility", "strict"]).optional(),
});

export const providerHealthSchema = z.object({
  providerId: idSchema.optional(),
  providerKey: z.string().trim().min(1).max(80).optional(),
  performLiveCheck: z.boolean().optional().default(false),
}).refine((value) => value.providerId || value.providerKey, {
  message: "必须提供 providerId 或 providerKey",
});

export const channelTestSchema = z.object({
  channel_id: idSchema,
  upstream_model_id: z.string().trim().min(1).max(240),
}).strict();

export const proCallSourceUpsertSchema = z.object({
  id: idSchema.optional(),
  source_key: z.string().trim().min(1).max(80),
  display_name: z.string().trim().min(1).max(120),
  base_url: z.string().trim().url(),
  api_key: optionalSecretSchema,
  clear_api_key: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.id && !value.api_key?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["api_key"],
      message: "新建调用来源必须填写 API Key",
    });
  }
  if (value.clear_api_key && !value.api_key?.trim() && value.is_enabled !== false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["api_key"],
      message: "启用的调用来源不能清空 API Key",
    });
  }
});

export const proModelUpsertSchema = z.object({
  id: idSchema.optional(),
  display_name: z.string().trim().min(1).max(160),
  model_alias: z.string().trim().min(1).max(120),
  upstream_model_id: z.string().trim().min(1).max(240),
  source_id: idSchema,
  points_cost: z.number().int().min(0).max(1000),
  is_enabled: z.boolean().optional(),
}).strict();

export const proFeatureAssignmentUpsertSchema = z.object({
  route_key: z.string().trim().min(1).max(120),
  capability: aiModelCapabilitySchema,
  model_id: idSchema,
  points_cost: z.number().int().min(0).max(1000),
  is_enabled: z.boolean().optional(),
}).strict();

const routeModelOperationPayloadSchema = z.object({
  route_id: idSchema,
  model_id: idSchema,
  fallback_model_id: idSchema.nullable().optional(),
}).strict();

const entitlementOperationPayloadSchema = z.object({
  plan_key: aiPlanKeySchema,
  model_id: idSchema,
  access_level: aiEntitlementAccessSchema.default("allowed"),
  feature_label: optionalTextSchema,
  is_enabled: z.boolean().optional().default(true),
}).strict();

export const changeSetOperationSchema = z.discriminatedUnion("operation_type", [
  z.object({
    operation_type: z.literal("set_route_model"),
    target_resource: z.literal("route"),
    target_id: idSchema,
    proposed_payload: routeModelOperationPayloadSchema,
    sort_order: z.number().int().min(0).max(10_000).optional(),
  }).strict(),
  z.object({
    operation_type: z.literal("upsert_entitlement"),
    target_resource: z.literal("entitlement"),
    target_id: idSchema.nullable().optional(),
    proposed_payload: entitlementOperationPayloadSchema,
    sort_order: z.number().int().min(0).max(10_000).optional(),
  }).strict(),
]);

export const changeSetCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  summary: optionalTextSchema,
  operations: z.array(changeSetOperationSchema).min(1).max(200),
}).strict();

export type ProviderUpsertInput = z.infer<typeof providerUpsertSchema>;
export type ProviderChannelUpsertInput = z.infer<typeof providerChannelUpsertSchema>;
export type ModelChannelMappingUpsertInput = z.infer<typeof modelChannelMappingUpsertSchema>;
export type ModelUpsertInput = z.infer<typeof modelUpsertSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type EntitlementUpsertInput = z.infer<typeof entitlementUpsertSchema>;
export type RouteUpsertInput = z.infer<typeof routeUpsertSchema>;
export type CreditPolicyUpsertInput = z.infer<typeof creditPolicyUpsertSchema>;
export type ProCallSourceUpsertInput = z.infer<typeof proCallSourceUpsertSchema>;
export type ProModelUpsertInput = z.infer<typeof proModelUpsertSchema>;
export type ProFeatureAssignmentUpsertInput = z.infer<typeof proFeatureAssignmentUpsertSchema>;
export type ChangeSetCreateInput = z.infer<typeof changeSetCreateSchema>;
export type ChangeSetOperationInput = z.infer<typeof changeSetOperationSchema>;
