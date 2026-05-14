# Security Specification - Buku Kas RT

## Data Invariants
- A transaction must have a non-negative amount.
- A transaction must have a type: 'income' or 'expense'.
- A transaction must have a category and a description (max 500 chars).
- A transaction must be linked to the creating user's UID.
- Timestamps must be server-generated.

## The "Dirty Dozen" Payloads (Targets for PERMISSION_DENIED)
1. **Identity Spoofing**: `userId` in payload doesn't match `request.auth.uid`.
2. **Negative Amount**: `amount: -100`.
3. **Ghost Fields**: Adding `isVerified: true` to a transaction.
4. **Invalid Type**: `type: 'stolen'`.
5. **Missing Required Field**: No `date`.
6. **Large Payload**: `description` > 1000 chars.
7. **Client Timestamp**: Trying to set `createdAt` to a month ago.
8. **Unauthorized Entry**: Creating a record without being logged in.
9. **Update Hijack**: Changing `amount` of someone else's transaction.
10. **Delete Hijack**: Deleting someone else's transaction.
11. **ID Injection**: Using a 2KB string as a document ID.
12. **Status Bypass**: Changing `createdAt` after creation.

## Rules Implementation Strategy
- Use `isValidTransaction` helper.
- Enforce strict keys on create.
- Enforce immutability on `userId` and `createdAt`.
- Use `request.time` for timestamps.
