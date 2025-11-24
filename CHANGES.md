# Admin Web cleanup notes

- Archived unused Ant Design routes and customer demo UI under `src/legacy/` to keep the active admin surface focused.
- Added coupon domain types (`src/types/coupon.ts`) and rewired coupon service/hook/UI to use zod validation, typed payloads, and translated error messages.
- Hardened API/error utilities by normalizing error payloads with typed guards in `src/lib/api.ts` and `src/lib/errors.ts`.
- Prevented auth endpoints from triggering token-refresh redirects so login/signup errors surface to the UI.
- Polished sign-in UX: consistent language toggle labels and a neutral password placeholder.
- Added the missing i18n key `coupons.value_required` (en/ar) and set `VITE_API_BASE=https://api.fasket.cloud` in `.env.local`.
- Category and product uploads now use the shared upload endpoint with 2MB client-side caps to avoid 413 errors, and uploads service enforces the same limit.
