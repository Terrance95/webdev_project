# ProofStake

ProofStake is a Vite + React peer-verification arena. Players stake demo points on challenges, submit image receipts, and review one another's proof.

## Run locally

1. Install the dependencies from the existing lockfile with `npm ci`.
2. Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.
3. Run `supabase_setup.sql` in the Supabase SQL Editor if the ProofStake schema and `ps-proof-images` bucket are not already provisioned.
4. Start the app with `npm run dev`.

The app uses only `ps_profiles`, `ps_challenges`, `ps_participants`, `ps_proofs`, `ps_verifications`, and the `ps-proof-images` bucket.

## Prototype security limitation

Player identity is a username and a profile ID stored in the browser, not authenticated identity. The public policies in `supabase_setup.sql` allow anonymous clients to modify demo records and balances. Stakes are not money and this setup must not be used for real funds or sensitive data. Use Supabase Auth and server-side, transactional operations before deploying a production arena.
