# @euda/crypto

EudaChat E2EE is client-side Signal. Portable WebCrypto (group sender keys, media AES-GCM) ships in this package. Pairwise X3DH uses `@privacyresearch/libsignal-protocol-typescript` when you add that dependency for a device session. Each device publishes a public bundle to `pre_key_bundles` and delivers ciphertext as `message_envelopes` over Supabase Realtime. Session state stays on the device — there is no NestJS crypto service and the server never sees plaintext.
