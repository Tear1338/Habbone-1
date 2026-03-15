import { z } from 'zod'

// Helpers
export function searchParamsToObject(sp: URLSearchParams) {
  const obj: Record<string, string> = {}
  for (const [k, v] of sp.entries()) obj[k] = v
  return obj
}

export function formatZodError(error: z.ZodError) {
  const flat = error.flatten()
  return {
    fieldErrors: flat.fieldErrors,
    formErrors: flat.formErrors,
  }
}

export function buildError(error: string, opts?: { code?: string; fields?: Record<string, string[]> }) {
  return {
    error,
    ...(opts?.code ? { code: opts.code } : {}),
    ...(opts?.fields ? { fields: opts.fields } : {}),
  }
}

// Schemas
export const CheckUserQuerySchema = z.object({
  nick: z.string().trim().min(1, 'nick requis').max(32, 'nick trop long'),
  hotel: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toLowerCase() : undefined))
    .refine((v) => v === undefined || HabboHotelEnum.options.includes(v as any), 'hotel invalide'),
})

export const HabboHotelEnum = z.enum(['fr', 'com', 'com.br', 'es', 'it', 'de', 'nl', 'fi', 'com.tr'])

export const RegisterBodySchema = z.object({
  nick: z.string().trim().min(3, 'nick trop court').max(32, 'nick trop long'),
  password: z.string().min(6, 'mot de passe trop court').max(128, 'mot de passe trop long'),
  email: z
    .string()
    .email('email invalide')
    .max(254, 'email trop long')
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
  hotel: z
    .string()
    .optional()
    .transform((v) => (v ? v.toLowerCase().trim() : 'fr'))
    .refine((v) => HabboHotelEnum.options.includes(v as any), 'hotel invalide')
    .transform((v) => v as z.infer<typeof HabboHotelEnum>),
})

const HabboProfileLite = z.object({
  lite: z
    .string()
    .optional()
    .transform((v) => (v ? ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()) : false)),
})

export const HabboProfileQuerySchema = z
  .union([
    z.object({ name: z.string().trim().min(1, 'name requis').max(64, 'name trop long') }),
    z.object({ id: z.string().trim().min(1, 'id requis').max(128, 'id trop long') }),
  ])
  .and(HabboProfileLite)

export const VerificationStatusSchema = z.object({
  nick: z.string().trim().min(3, 'nick requis').max(32, 'nick trop long'),
  code: z.string().trim().min(4, 'code requis').max(64, 'code trop long'),
})

export const VerificationRegenerateSchema = z.object({
  nick: z.string().trim().min(3, 'nick requis').max(32, 'nick trop long'),
  hotel: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toLowerCase() : undefined))
    .refine((v) => v === undefined || HabboHotelEnum.options.includes(v as any), 'hotel invalide'),
})
