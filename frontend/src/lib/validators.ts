import { z } from "zod";

const pin = z
  .string()
  .regex(/^\d{6}$/, "Your PIN must be exactly 6 digits.");

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Please enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const signupSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    phone,
    display_name: z.string().trim().min(1, "Please enter your name.").max(120),
    pin,
    confirm_pin: z.string(),
  })
  .refine((d) => d.pin === d.confirm_pin, {
    message: "Both PINs must match.",
    path: ["confirm_pin"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your email or phone number."),
  pin,
});

export type LoginValues = z.infer<typeof loginSchema>;

export const changePinSchema = z
  .object({
    current_pin: pin,
    new_pin: pin,
    confirm_pin: z.string(),
  })
  .refine((d) => d.new_pin === d.confirm_pin, {
    message: "Both new PINs must match.",
    path: ["confirm_pin"],
  });

export type ChangePinValues = z.infer<typeof changePinSchema>;

export const expenseSchema = z.object({
  name: z.string().trim().min(1, "Give this expense a name.").max(120),
  amount: z
    .string()
    .min(1, "Enter an amount.")
    .refine((v) => Number(v) > 0, "Amount must be greater than zero."),
  category_id: z.coerce.number().int().positive("Choose a category."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  spent_at: z.string().min(1, "Pick a date and time."),
});

export type ExpenseValues = z.infer<typeof expenseSchema>;
