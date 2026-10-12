# JJ Ecosystem (Android app)

Personal, offline notes app. Built from the JJ Ecosystem design in Claude.

## How it works

- `src/app.html` is the app itself (the same file as the design artifact).
- `web/` holds what makes it work offline: fonts, export libraries and `shell.js`
  (on-device storage, saving files, the Android back button).
- Every push to `main` builds a signed APK with GitHub Actions and publishes it under **Releases**.

## Your data

Notes, databases, photos and settings are stored only on the device, inside the app.
Installing a new version keeps them. **Uninstalling deletes them**, so never uninstall to update.
Use **Settings → Back up now** now and then.

## Updating the app

1. Replace `src/app.html` with the new version and push to `main`.
2. Wait for the **Build APK** action to finish.
3. On the phone/tablet, open the newest release, download the APK and install it over the old one.

## Signing

`keys/release.jks.enc` is the signing key, encrypted. Its password is the repository secret
`JJ_KEYSTORE_PASS`. Every update must be signed with this same key, or Android refuses to install it.
Keep the password somewhere safe.
