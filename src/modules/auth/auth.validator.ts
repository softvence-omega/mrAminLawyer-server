import { z } from "zod";

export const logInValidator = z.object({
  body: z.object({
    email: z.string().email({ message: "Valid email is required" }).optional(),
    password: z.string().optional(),
    method: z.enum(["google", "email_Pass"]).optional()
  }),
});