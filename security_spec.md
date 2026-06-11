# Security Specification & Test Scenarios

## 1. Data Invariants
- Users can view and manage only their own account document (`/users/{userId}`) matching their authentication `uid`.
- User resumes (`/users/{userId}/resumes/{resumeId}`) are fully isolated: users can read and write only their own designs.
- Admins (identified by email `veira1x1@gmail.com` matching credentials) have full read and write access to all resources.
- Anyone can read global configurations (`/config/brand`) or lookup vouchers (`/vouchers/{code}`), but only an authenticated administrator can write configs or generate vouchers.

## 2. Dirty Dozen Penetration Test Payloads
1. Attempt to read another user's client account configuration. (Rejects - non-matching UID)
2. Attempt to write or update another user's `credits` balance directly. (Rejects - unauthorized modification)
3. Attempt to fetch/list all user resumes. (Rejects - only own resumes reachable)
4. Attempt to edit another user's resume records. (Rejects)
5. Attempt to rewrite the main system config `/config/brand`. (Rejects - requires verified admin uid/email)
6. Attempt to upload a custom voucher directly as a client. (Rejects - blocks client voucher generation)
7. Attempt to inject malware/huge payloads into a resume document ID. (Rejects - `isValidId` validates length and alphanumeric)
8. Attempt to spoof the admin email in oauth token without verification status. (Rejects - requires verified status)
9. Attempt to create a resume with an invalid data structure. (Rejects - schema checked)
10. Attempt to delete another client's resumes. (Rejects)
11. Attempt to bypass subcollection rule rules via arbitrary wildcards. (Rejects - global deny-all)
12. Attempt to update a voucher's active status from false to true without authorization. (Rejects)
