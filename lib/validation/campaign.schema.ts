import { z } from 'zod'

export const segmentRuleSchema = z.object({
  field: z.enum(['totalSpent', 'visits', 'lastVisit', 'createdAt']),
  operator: z.enum(['>', '<', '>=', '<=', '=', '!=', 'contains', 'not_contains', 'days_ago']),
  value: z.union([z.string(), z.number()]),
  logic: z.enum(['AND', 'OR']).optional(),
})

export const campaignSchema = z.object({
  name: z.string().min(1).max(100),
  rules: z.array(segmentRuleSchema).min(1),
  message: z.string().min(1).max(500),
})

export type CampaignInput = z.infer<typeof campaignSchema>
export type SegmentRule = z.infer<typeof segmentRuleSchema>
