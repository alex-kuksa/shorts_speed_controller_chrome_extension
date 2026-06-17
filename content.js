const STORAGE_KEY = "shortsPlaybackSpeed";
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const SPEED_STEP = 0.05;
const SPEEDS = [0.25, 0.5, 1, 1.25, 1.5, 2, 3, 4];

let currentSpeed = 1;
let lastButtonToggleAt = 0;
const observedVideos = new WeakSet();

function isShortsPage() {
  return location.pathname.startsWith("/shorts/");
}

function formatSpeed(speed) {
  return `${Number(speed).toFixed(2).replace(/\.?0+$/, "")}x`;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeSpeed(speed) {
  const numericSpeed = Number(speed);

  if (!Number.isFinite(numericSpeed)) return 1;

  const steppedSpeed = Math.round(numericSpeed / SPEED_STEP) * SPEED_STEP;
  return Number(clamp(steppedSpeed, MIN_SPEED, MAX_SPEED).toFixed(2));
}

function getStorageArea() {
  return globalThis.chrome?.storage?.local ?? null;
}

function saveSpeed(speed) {
  const storage = getStorageArea();
  if (!storage) return;

  storage.set({ [STORAGE_KEY]: normalizeSpeed(speed) });
}

function loadSavedSpeed(callback) {
  const storage = getStorageArea();

  if (!storage) {
    callback();
    return;
  }

  storage.get({ [STORAGE_KEY]: currentSpeed }, result => {
    const runtimeError = globalThis.chrome?.runtime?.lastError;
    const savedSpeed = runtimeError ? currentSpeed : result[STORAGE_KEY];

    setSpeed(savedSpeed, false);
    callback();
  });
}

function getEventElement(event) {
  if (event.target?.nodeType === Node.ELEMENT_NODE) return event.target;
  return event.target?.parentElement ?? null;
}

function handleSpeedButtonActivation(event) {
  const target = getEventElement(event);

  if (!target?.closest("#shorts-speed-button")) return;
  if (event.type === "pointerup" && event.pointerType === "mouse" && event.button !== 0) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const now = Date.now();
  if (now - lastButtonToggleAt < 300) return;

  lastButtonToggleAt = now;
  toggleSpeedPanel();
}

function isVisibleVideo(video) {
  const rect = video.getBoundingClientRect();

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function getVideos() {
  const videos = Array.from(document.querySelectorAll("video"));
  const activeShort = document.querySelector("ytd-reel-video-renderer[is-active]");
  const activeVideo = activeShort?.querySelector("video");

  if (activeVideo) {
    return [activeVideo, ...videos.filter(video => video !== activeVideo)];
  }

  return videos.sort((a, b) => Number(isVisibleVideo(b)) - Number(isVisibleVideo(a)));
}

function observeVideo(video) {
  if (observedVideos.has(video)) return;

  observedVideos.add(video);
  video.addEventListener("ratechange", () => {
    if (!isShortsPage()) return;

    requestAnimationFrame(() => {
      if (Math.abs(video.playbackRate - currentSpeed) > 0.001) {
        applySpeedToVideo(video, currentSpeed);
      }
    });
  });
}

function applySpeedToVideo(video, speed) {
  video.defaultPlaybackRate = speed;
  video.playbackRate = speed;
}

function updateSliderFill(slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const value = Number(slider.value);
  const percent = ((clamp(value, min, max) - min) / (max - min)) * 100;

  slider.style.setProperty("--speed-fill", `${percent}%`);
}

function updateSpeedControls(speed) {
  const label = document.querySelector("#shorts-speed-btn-label");
  if (label) label.textContent = formatSpeed(speed);

  const display = document.querySelector(".shorts-speed-display");
  if (display) display.textContent = formatSpeed(speed);

  const slider = document.querySelector("#speed-slider");
  if (slider) {
    slider.value = speed;
    updateSliderFill(slider);
  }
}

function setSpeed(speed, shouldSave = true) {
  currentSpeed = normalizeSpeed(speed);

  getVideos().forEach(video => {
    observeVideo(video);
    applySpeedToVideo(video, currentSpeed);
  });

  updateSpeedControls(currentSpeed);

  if (shouldSave) saveSpeed(currentSpeed);
}

function positionSpeedPanel(panel) {
  const button = document.querySelector("#shorts-speed-button");
  const buttonRect = button?.getBoundingClientRect();
  const viewportPadding = 12;
  const gap = 8;

  if (!buttonRect) return;

  const panelRect = panel.getBoundingClientRect();
  const maxLeft = window.innerWidth - panelRect.width - viewportPadding;
  const maxTop = window.innerHeight - panelRect.height - viewportPadding;
  const preferredLeft = buttonRect.left + (buttonRect.width / 2) - (panelRect.width / 2);
  const preferredTop = buttonRect.bottom + gap;

  panel.style.left = `${clamp(preferredLeft, viewportPadding, maxLeft)}px`;
  panel.style.top = `${clamp(preferredTop, viewportPadding, maxTop)}px`;
}

function createSpeedButton() {
  const wrapper = document.createElement("div");
  wrapper.id = "shorts-speed-button-container";
  wrapper.className = "button-container style-scope ytd-shorts-player-controls";
  wrapper.style.pointerEvents = "auto";

  wrapper.innerHTML = `
    <button id="shorts-speed-button" title="Скорость воспроизведения" aria-label="Скорость воспроизведения">
      <span id="shorts-speed-btn-label">${formatSpeed(currentSpeed)}</span>
    </button>
  `;

  const button = wrapper.querySelector("button");

  Object.assign(button.style, {
    color: "white",
    background: "transparent",
    border: "none",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    cursor: "pointer",
    pointerEvents: "auto",
    fontSize: "14px",
    fontWeight: "600",
    filter: "drop-shadow(0px 1px 4px rgba(0,0,0,0.3))"
  });

  button.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    toggleSpeedPanel();
  });

  return wrapper;
}

function createSpeedPanel() {
  const old = document.querySelector("#shorts-speed-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "shorts-speed-panel";

  panel.innerHTML = `
    <div class="shorts-speed-header">
      <div class="shorts-speed-display">${formatSpeed(currentSpeed)}</div>
      <button id="shorts-speed-close" title="Закрыть" aria-label="Закрыть">×</button>
    </div>

    <div class="shorts-speed-row">
      <button id="speed-minus">−</button>
      <input id="speed-slider" type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="${SPEED_STEP}" value="${currentSpeed}">
      <button id="speed-plus">+</button>
    </div>

    <div class="shorts-speed-chips">
      ${SPEEDS.map(speed => `
        <button class="shorts-speed-chip" data-speed="${speed}">
          ${String(speed).replace(".", ",")}
        </button>
      `).join("")}
    </div>
  `;

  Object.assign(panel.style, {
    position: "fixed",
    zIndex: "999999",
    width: "330px",
    background: "rgba(28, 28, 28, 0.96)",
    color: "white",
    borderRadius: "12px",
    fontFamily: "Roboto, Arial, sans-serif",
    padding: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,.4)"
  });

  addPanelStyles();

  document.body.appendChild(panel);
  panel.addEventListener("pointerdown", event => event.stopPropagation());
  panel.addEventListener("click", event => event.stopPropagation());
  positionSpeedPanel(panel);

  const slider = panel.querySelector("#speed-slider");
  updateSliderFill(slider);

  slider.addEventListener("input", () => {
    setSpeed(slider.value);
  });

  panel.querySelector("#speed-minus").addEventListener("click", () => {
    slider.value = normalizeSpeed(Number(slider.value) - SPEED_STEP);
    slider.dispatchEvent(new Event("input"));
  });

  panel.querySelector("#speed-plus").addEventListener("click", () => {
    slider.value = normalizeSpeed(Number(slider.value) + SPEED_STEP);
    slider.dispatchEvent(new Event("input"));
  });

  panel.querySelector("#shorts-speed-close").addEventListener("click", () => {
    panel.remove();
  });

  panel.querySelectorAll(".shorts-speed-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      slider.value = btn.dataset.speed;
      slider.dispatchEvent(new Event("input"));
    });
  });
}

function toggleSpeedPanel() {
  const panel = document.querySelector("#shorts-speed-panel");

  if (panel) {
    panel.remove();
  } else {
    createSpeedPanel();
  }
}

function repositionOpenSpeedPanel() {
  const panel = document.querySelector("#shorts-speed-panel");
  if (panel) positionSpeedPanel(panel);
}

function addPanelStyles() {
  if (document.querySelector("#shorts-speed-style")) return;

  const style = document.createElement("style");
  style.id = "shorts-speed-style";
  style.textContent = `
    .shorts-speed-header {
      display: grid;
      grid-template-columns: 32px 1fr 32px;
      align-items: center;
      margin-bottom: 16px;
      min-height: 32px;
    }

    #shorts-speed-close {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      grid-column: 3;
      grid-row: 1;
    }

    .shorts-speed-display {
      grid-column: 2;
      grid-row: 1;
      text-align: center;
      font-size: 28px;
      margin: 0;
    }

    .shorts-speed-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }

    .shorts-speed-row button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,.15);
      color: white;
      font-size: 22px;
      cursor: pointer;
    }

    #speed-slider {
      --speed-fill: 20%;
      -webkit-appearance: none;
      appearance: none;
      flex: 1;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(
        to right,
        white 0%,
        white var(--speed-fill),
        rgba(255,255,255,.35) var(--speed-fill),
        rgba(255,255,255,.35) 100%
      );
      cursor: pointer;
      outline: none;
    }

    #speed-slider::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 999px;
      background: transparent;
    }

    #speed-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      margin-top: -6px;
      border: none;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }

    #speed-slider::-moz-range-track {
      height: 4px;
      border-radius: 999px;
      background: rgba(255,255,255,.35);
    }

    #speed-slider::-moz-range-progress {
      height: 4px;
      border-radius: 999px;
      background: white;
    }

    #speed-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border: none;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }

    #speed-slider:focus-visible::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px rgba(255,255,255,.3), 0 1px 4px rgba(0,0,0,.35);
    }

    #speed-slider:focus-visible::-moz-range-thumb {
      box-shadow: 0 0 0 3px rgba(255,255,255,.3), 0 1px 4px rgba(0,0,0,.35);
    }

    .shorts-speed-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .shorts-speed-chip {
      background: rgba(255,255,255,.15);
      color: white;
      border: none;
      border-radius: 18px;
      padding: 8px 14px;
      cursor: pointer;
      font-size: 14px;
    }

    .shorts-speed-chip:hover,
    .shorts-speed-row button:hover {
      background: rgba(255,255,255,.25);
    }
  `;

  document.head.appendChild(style);
}

function injectSpeedButton() {
  if (!isShortsPage()) {
    document.querySelector("#shorts-speed-panel")?.remove();
    document.querySelector("#shorts-speed-button-container")?.remove();
    return;
  }

  const rightControls = document.querySelector("ytd-shorts-player-controls #right-controls");

  if (!rightControls) return;
  if (document.querySelector("#shorts-speed-button-container")) return;

  const speedButton = createSpeedButton();

  rightControls.insertBefore(speedButton, rightControls.firstElementChild);
}

function keepSpeedApplied() {
  if (!isShortsPage()) return;

  getVideos().forEach(video => {
    observeVideo(video);

    if (Math.abs(video.playbackRate - currentSpeed) > 0.001) {
      applySpeedToVideo(video, currentSpeed);
    }
  });
}

function watchSavedSpeed() {
  const storageChanges = globalThis.chrome?.storage?.onChanged;
  if (!storageChanges) return;

  storageChanges.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;

    const nextSpeed = normalizeSpeed(changes[STORAGE_KEY].newValue);
    if (Math.abs(nextSpeed - currentSpeed) > 0.001) {
      setSpeed(nextSpeed, false);
    }
  });
}

function startSpeedController() {
  setInterval(() => {
    injectSpeedButton();
    keepSpeedApplied();
  }, 500);

  document.addEventListener("pointerup", handleSpeedButtonActivation, true);
  document.addEventListener("click", handleSpeedButtonActivation, true);
  window.addEventListener("resize", repositionOpenSpeedPanel);
  watchSavedSpeed();
}

loadSavedSpeed(startSpeedController);
