import { z } from "zod";

const passwordSchema = z
	.string()
	.min(8)
	.refine((password) => new TextEncoder().encode(password).length <= 72, {
		message: "Password must not exceed 72 UTF-8 bytes",
	});

export const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(255),
	password: passwordSchema,
});

export const registerSchema = loginSchema.extend({
	fullName: z.string().trim().min(1).max(100).optional(),
});

export const updateProfileSchema = z
	.object({
		fullName: z.string().trim().min(1).max(100).nullable().optional(),
		avatarUrl: z.string().trim().url().max(255).nullable().optional(),
	})
	.strict()
	.refine((profile) => Object.keys(profile).length > 0, {
		message: "At least one profile field is required",
	});
