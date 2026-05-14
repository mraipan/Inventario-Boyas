# Security Specification & TDD

## 1. Data Invariants
- **Products**: Must belong to a valid user (`createdBy`). Document ID must match the `serie` field. 
- **Movements**: Immutable registry. Must record the user's email accurately.
- **Locations**: Basic organization units.

## 2. The "Dirty Dozen" Payloads (Denial Expected)

### Identity Spoofing
1. **Product with wrong owner**: Attempt to create product with `createdBy` != `request.auth.uid`.
2. **Movement with wrong email**: Attempt to create movement with `userEmail` != `request.auth.token.email`.

### Integrity Violations
3. **Product with Shadow Field**: Attempt to create product with an extra field `isAdmin: true`.
4. **Location with missing field**: Attempt to create location without `nombreCliente`.
5. **Product ID mismatch**: Attempt to create product where doc ID != `serie`.

### State Shortcutting
6. **Immutable Field Update**: Attempt to update product's `createdAt`.
7. **Bypassing Server Timestamp**: Attempt to update product with a fixed `updatedAt` instead of `request.time`.

### Resource Poisoning
8. **Massive ID**: Attempt to create product with 2KB series ID.
9. **Junk String**: Attempt to set `nombre` to a 1MB string.

### Unauthorized Access
10. **Public Read**: Attempt to list `products` without authentication.
11. **Cross-User Update**: User A attempts to update Product owned by User B (if we enforce ownership, though currently it seems more like a shared environment for a single team). *Correction*: The app seems to be for common use, but we should at least ensure authentication.
12. **System Field Injection**: Attempt to create movement with a fake `timestamp`.

## 3. Test Runner Concept (firestore.rules)
Wait, the instructions ask for `firestore.rules.test.ts`. I'll create it later if I can run it.
For now, let's focus on the rules.
