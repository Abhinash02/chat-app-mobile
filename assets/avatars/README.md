# Avatar artwork

Drop two files here to replace the drawn characters app-wide:

    boy.png
    girl.png

Then uncomment the two `require` lines in `src/components/avatar-photos.js`.
Nothing else changes — every avatar in the app reads through that module.

## What the files need to be

| | |
|---|---|
| Format | PNG (JPG works too — change the extension in `avatar-photos.js` to match) |
| Size | Square, 512×512 minimum. 1024×1024 is better; they render up to ~175px at 3x. |
| Crop | Head and shoulders filling the frame |
| Background | Plain and light — it shows behind the character on discovery cards |

**Keep the subject centred.** Avatars are circle-cropped nearly everywhere in
the app, so roughly 20% of each corner is cut off. Anything near an edge is
lost.

Both files together should stay under about 1.5 MB — they are bundled into the
APK, not downloaded, so their size is added to every install.

## Reverting

Delete the files and re-comment the two lines. The vector characters in
`src/components/CartoonAvatar.jsx` come back with no other change.
