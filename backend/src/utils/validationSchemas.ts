import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
});

export const createTicketSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters long'),
    description: z.string().min(10, 'Description must be at least 10 characters long'),
    category: z.enum(['TECHNICAL', 'BILLING', 'GENERAL', 'REFUND'], {
      errorMap: () => ({ message: 'Category must be TECHNICAL, BILLING, GENERAL, or REFUND' })
    }),
  })
});

export const createMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty'),
  })
});

export const createOrderSchema = z.object({
  body: z.object({
    orderNumber: z.string().min(3, 'Order number required'),
    customerId: z.string().uuid('Invalid customer user ID'),
    totalAmount: z.number().positive('Total amount must be positive'),
    items: z.array(
      z.object({
        productName: z.string().min(1, 'Product name required'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        price: z.number().positive('Price must be positive')
      })
    ).min(1, 'Must include at least 1 item')
  })
});

export const chatQuerySchema = z.object({
  body: z.object({
    conversationId: z.string().optional(),
    message: z.string().min(1, 'Message content is required')
  })
});

export const checkoutSchema = z.object({
  body: z.object({
    priceId: z.string().min(1, 'Price ID is required'),
    successUrl: z.string().url('Invalid success URL'),
    cancelUrl: z.string().url('Invalid cancel URL'),
  })
});
