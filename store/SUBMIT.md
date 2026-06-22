# Submitting to the Chrome Web Store

## 1. Build the package
```bash
npm run package:ext
```
This produces `dist/lichess-kill-animations-v<version>.zip`.

## 2. One-time developer setup
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to publish under.
3. Pay the one-time USD 5 developer registration fee.

## 3. Create the listing
1. In the dashboard, click **New item** and upload the `.zip` from step 1.
2. Fill the store listing fields from `store/listing.md`:
   - Name, summary, description, category.
3. Upload assets:
   - **Icon:** `extension/icons/icon-128.png` (already in the package).
   - **Screenshots (required):** at least one 1280×800 or 640×400 PNG/JPEG.
     Recommended: capture a real capture animation on lichess.org
     (open a game/TV, make a capture, screenshot the board). Crop to 1280×800.
   - Optional small promo tile 440×280.
4. **Privacy practices:** declare "Does not collect user data". Paste the
   single-purpose and `storage` justification from `store/listing.md`. Link or
   paste `store/privacy.md` content as the privacy policy.

## 4. Submit for review
1. Set visibility (Public or Unlisted).
2. Click **Submit for review**. Review typically takes a few business days.

## 5. Updates
Bump `version` in `package.json`, run `npm run package:ext`, upload the new
`.zip` to the same item, and submit again.

## Note on permissions (gallery support)
The extension declares `background` (a tiny service worker) and
`externally_connectable` (the gallery origin) so the gallery can set the chosen
animation. It still requests only the `storage` permission and contains no
remote code. Single purpose is unchanged: kill animations on lichess.org.
