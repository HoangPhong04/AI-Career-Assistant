# Auth and Profile API Contract

All request and response bodies use JSON. Successful responses use `{ "data": ... }`; errors use `{ "error": { "code": "...", "message": "..." } }`.

## Endpoints

| Method | Path | Authentication | Success |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | `201 Created`; creates account and signs it in |
| `POST` | `/api/auth/login` | No | `200 OK`; signs in |
| `POST` | `/api/auth/logout` | Cookie, if present | `204 No Content`; clears cookie |
| `GET` | `/api/auth/me` | Yes | `200 OK`; current user |
| `GET` | `/api/auth` | Yes | `200 OK`; compatibility alias for `/me` |
| `GET` | `/api/profile` | Yes | `200 OK`; current user's profile |
| `PATCH` | `/api/profile` | Yes | `200 OK`; updated profile |

## Request Examples

Register:

```json
{
  "email": "learner@example.com",
  "password": "at-least-8-characters",
  "fullName": "Nguyen An"
}
```

Login:

```json
{
  "email": "learner@example.com",
  "password": "at-least-8-characters"
}
```

Passwords must contain at least 8 characters and no more than 72 UTF-8 bytes (bcrypt's input limit).

Profile update accepts only `fullName` and `avatarUrl`; include at least one field. `null` clears a field. Email and role are read-only through this endpoint.

```json
{
  "fullName": "Nguyen An",
  "avatarUrl": null
}
```

## Error Codes

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_JSON` | Body is not valid JSON |
| `400` | `VALIDATION_ERROR` | Body does not satisfy the endpoint schema |
| `401` | `INVALID_CREDENTIALS` | Login credentials are incorrect |
| `401` | `UNAUTHENTICATED` | A protected endpoint has no valid session |
| `409` | `EMAIL_ALREADY_EXISTS` | Registration email is already in use |
| `500` | `INTERNAL_ERROR` | Server could not complete the operation |

## Session and Authorization

The server stores a signed JWT in the `aca_session` cookie. It is `HttpOnly`, `SameSite=Lax`, scoped to `/`, and valid for seven days. It is marked `Secure` in production. The JWT subject identifies the user; protected requests verify the signature and expiration, then load the user from the database. User data responses never include `passwordHash`.

Dashboard pages are protected by the `(dashboard)` server layout. Each protected API must independently authenticate and scope database operations to the user ID from the verified session; never trust a client-supplied `userId`.

Logout clears the browser cookie. Because sessions are stateless, a copied token remains usable until expiration; immediate revocation requires persisted server-side sessions.