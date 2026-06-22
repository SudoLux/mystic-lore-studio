# Mobile Image Compression QA

Use this checklist on the deployed sync build and at least one physical iPhone.
The selected original should never be written to localStorage; only the optimized
upload payload and small preview are retained while an upload is pending.

## Device and Format Checks

- [ ] iPhone portrait photo: select a recent camera-roll image larger than 6 MB.
  Confirm `Optimizing image...` appears, the preview is upright, and the longest
  optimized edge is no larger than 1600 px.
- [ ] Large JPEG: confirm the quality and dimension ladder produces an image no
  larger than 2 MB without showing the former hard-limit error.
- [ ] PNG screenshot: confirm text remains legible and WebP is preferred when the
  browser supports it.
- [ ] Already-small image: confirm it is not upscaled and appears in the selected
  slot after saving.
- [ ] HEIC/HEIF: confirm supported iPhone Safari versions decode the image. On an
  unsupported browser, confirm the helpful unsupported-image message appears.
- [ ] Unsupported file: confirm the picker or processor rejects it with:
  `This image is unusually large or unsupported. Try a screenshot or smaller export.`

## Persistence and Sync Checks

- [ ] Online Supabase session: confirm the optimized payload uploads to the
  private `project-images` bucket and the local asset is replaced with storage
  metadata plus its compact preview.
- [ ] Offline/local fallback: confirm the optimized image appears immediately,
  survives refresh, remains adjustable, and uploads after reconnecting.
- [ ] Verify project hero, gallery, Fabric Vault, and lookbook slots.
- [ ] Verify fit, position, zoom, card mapping, Dashboard hero, replace, and remove
  behavior remain unchanged.
- [ ] Open the same account on another device and confirm the uploaded image and
  display settings hydrate from Supabase.
