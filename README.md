# Shorts Speed Controller

Chrome extension that adds playback speed controls directly to the YouTube
Shorts player.

## Features

- Speed control inside the Shorts player controls.
- Presets from `0.25x` to `4x`.
- Fine adjustment with a slider.
- Saved speed across reloads and Shorts tabs.
- No analytics, no external requests, no remote code.

This extension is not affiliated with YouTube or Google.

## Local Installation

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Open a YouTube Shorts page.

After changing `manifest.json`, reload the extension in `chrome://extensions`.
After changing `content.js`, reload the Shorts page.

## Project Structure

```text
.
├── content.js
├── manifest.json
├── icons/
├── store-assets/
├── docs/
└── .github/workflows/
```

`icons/` is included in the extension package.

`store-assets/` is for Chrome Web Store listing images and is not included in
the extension ZIP.

`docs/privacy/` contains the Privacy Policy published to GitHub Pages.

## Chrome Web Store Assets

Current listing assets:

- `store-assets/store-icon-128.png`
- `store-assets/screenshot-1280x800.png`
- `store-assets/promo-small-440x280.png`

The extension package should include only:

- `manifest.json`
- `content.js`
- `icons/`

## Release Workflow

GitHub Actions runs only when a tag matching `v*` is pushed.

Example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow:

- validates `content.js`;
- validates `manifest.json` and icon paths;
- builds a Chrome extension ZIP;
- uploads the ZIP as a workflow artifact;
- creates or updates a GitHub Release with the ZIP attached;
- deploys the Privacy Policy from `docs/` to GitHub Pages.

Before the first Pages deploy, enable:

```text
Settings -> Pages -> Source -> GitHub Actions
```

Because releases are triggered from tags, also allow release tags to deploy to
the `github-pages` environment:

```text
Settings -> Environments -> github-pages -> Deployment branches and tags
```

Select either all tags or selected tags with this pattern:

```text
v*
```

Privacy Policy URL format:

```text
https://<username>.github.io/<repo>/privacy/
```

## Privacy

The extension stores only the selected playback speed in Chrome extension
storage. It does not collect, transmit, sell, rent, or share personal data.

See `docs/privacy/index.html`.
