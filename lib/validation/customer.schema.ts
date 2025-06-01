import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  totalSpent: z.number().min(0).optional().default(0),
  visits: z.number().int().min(0).optional().default(0),
  lastVisit: z.string().datetime().optional(),
})

export const customerUpdateSchema = customerSchema.partial().extend({
  id: z.string().cuid(),
})

export const customerBulkSchema = z.object({
  customers: z.array(customerSchema).min(1).max(1000),
})

export type CustomerInput = z.infer<typeof customerSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
export type CustomerBulkInput = z.infer<typeof customerBulkSchema>
