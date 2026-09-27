# Android wrapper (Trusted Web Activity)

Wraps https://projectasimov.github.io/tasktracker/ as an Android app with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). The web app is
the real app; this shell just launches it full-screen and gives it a Play
Store listing. Package `com.projectasimov.tasktracker`.

## Release a new version

1. Bump `appVersionCode` (+1) and `appVersionName` in `twa-manifest.json`.
2. `npx @bubblewrap/cli update` (regenerates the Android project from the manifest), then `npx @bubblewrap/cli build`.
3. Sign the bundle with the upload key (Bubblewrap signs the APK; the bundle needs jarsigner):

```
jarsigner -keystore %USERPROFILE%\.secrets\tasktracker\android-upload.keystore ^
  -storepass:file %USERPROFILE%\.secrets\tasktracker\android-upload.txt ^
  -keypass:file %USERPROFILE%\.secrets\tasktracker\android-upload.txt ^
  -sigalg SHA256withRSA -digestalg SHA-256 ^
  app\build\outputs\bundle\release\app-release.aab upload
```

4. Upload the `.aab` in the Play Console.

Web-only changes never need a new Android release; the shell loads the live site.

## Keys

The upload keystore and its password live outside the repo in
`%USERPROFILE%\.secrets\tasktracker\` (`android-upload.keystore`, alias
`upload`; password in `android-upload.txt`). Play App Signing holds the real
app signing key; this key only signs uploads and can be reset through Play
support if lost. Back both files up somewhere safe.

## Digital Asset Links

`assetlinks.json` here must be published at
`https://projectasimov.github.io/.well-known/assetlinks.json` (the
`ProjectAsimov.github.io` repo). It carries the SHA-256 of the certificate
that signs the *installed* app. After enrolling in Play App Signing, add the
**app signing key** certificate fingerprint from Play Console → Setup → App
integrity alongside the upload key's, or the app opens with a browser bar.

JDK and Android SDK downloaded by Bubblewrap live in `%USERPROFILE%\.bubblewrap\`.
