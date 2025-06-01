import { z } from 'zod'

export const orderSchema = z.object({
  customerId: z.string().cuid(),
  amount: z.number().positive(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).optional(),
})

export const orderBulkSchema = z.object({
  orders: z.array(orderSchema).min(1).max(1000),
})

export type OrderInput = z.infer<typeof orderSchema>
export type OrderBulkInput = z.infer<typeof orderBulkSchema>
