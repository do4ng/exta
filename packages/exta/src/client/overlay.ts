let overlayEl = null;
function ensureOverlay() {
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = '__exta_overlay';
    overlayEl.style.cssText = `
      min-width: 100px;
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 99999;
      font-family: Consolas, "Courier New", monospace;
      background: rgba(0,0,0,0.78);
      color: #fff;
      padding: 10px 14px;
      border-radius: 10px;
      box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px;
      font-size: 14px;
      line-height: 1.35;
      max-width: 320px;
      backdrop-filter: blur(4px);
      transition: opacity 200ms ease, transform 200ms ease;
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
      display: none;
    `;
    document.body.appendChild(overlayEl);

    // transition 끝났을 때 opacity=0이면 display none 처리
    overlayEl.addEventListener('transitionend', () => {
      if (overlayEl.style.opacity === '0') {
        overlayEl.style.display = 'none';
      }
    });
  }
}

function show(text) {
  ensureOverlay();
  if (text) overlayEl.textContent = text;
  overlayEl.style.display = 'block';
  requestAnimationFrame(() => {
    overlayEl.style.opacity = '1';
    overlayEl.style.transform = 'translateY(0) scale(1)';
  });
}

function setText(text) {
  ensureOverlay();
  overlayEl.textContent = text;
}

function hide() {
  if (!overlayEl) return;
  overlayEl.style.opacity = '0';
  overlayEl.style.transform = 'translateY(-6px) scale(0.98)';
}

export { show, setText, hide };

if (typeof window !== 'undefined') {
  window.__overlay__ = {
    show,
    setText,
    hide,
  };
}
