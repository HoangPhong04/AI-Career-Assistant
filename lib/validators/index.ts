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
	})
	.strict()
	.refine((profile) => Object.keys(profile).length > 0, {
		message: "At least one profile field is required",
	});

export const changePasswordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1)
			.refine((password) => new TextEncoder().encode(password).length <= 72, {
				message: "Current password must not exceed 72 UTF-8 bytes",
			}),
		newPassword: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine((passwords) => passwords.newPassword === passwords.confirmPassword, {
		message: "New password and confirmation do not match",
		path: ["confirmPassword"],
	})
	.refine((passwords) => passwords.newPassword !== passwords.currentPassword, {
		message: "New password must be different from the current password",
		path: ["newPassword"],
	});
