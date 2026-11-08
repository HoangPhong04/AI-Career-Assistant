export function belongsToUser(
  resource: { userId?: string | null } | null | undefined,
  userId: string
) {
  return resource?.userId === userId;
}
