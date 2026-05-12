/**
 * auth.js — 共用密碼驗證模組
 *
 * 使用方式：
 *   import { initAuth } from './auth.js';
 *   initAuth({ password: '12345678', pageKey: 'mom', hint: '提示文字' });
 */

export function initAuth({ password, pageKey, hint = '請輸入密碼' }) {
  if (sessionStorage.getItem('auth_' + pageKey) === '1') {
    showContent();
    return;
  }

  // ── CSS ─────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .page-inner {
      opacity: 0;
      pointer-events: none;
      user-select: none;
    }

    #auth-gate {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: #0d0d0d;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 2rem 1.5rem 3rem;
      animation: gateIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
    }

    @keyframes gateIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* 提示文字 */
    #auth-gate .gate-hint-text {
      font-family: 'Noto Serif TC', serif;
      font-size: 0.68rem;
      letter-spacing: 0.18em;
      color: #aaa39c;
      margin-bottom: 2.8rem;
      text-align: center;
      line-height: 1.8;
    }

    /* 八個圓點 */
    #auth-gate .gate-dots {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2.8rem;
    }

    #auth-gate .dot-slot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid #2e2924;
      background: transparent;
      transition: background 0.18s, border-color 0.18s, transform 0.18s;
    }

    #auth-gate .dot-slot.filled {
      background: #c8a97e;
      border-color: #c8a97e;
      transform: scale(1.15);
    }

    #auth-gate .dot-slot.error {
      background: #d76868;
      border-color: #d76868;
      transform: scale(1);
      animation: dotShake 0.35s ease both;
    }

    @keyframes dotShake {
      0%,100% { transform: translateX(0); }
      25%      { transform: translateX(-3px); }
      75%      { transform: translateX(3px); }
    }

    /* 鍵盤容器 */
    #auth-gate .keypad {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
    }

    #auth-gate .key-row {
      display: flex;
      gap: 0.5rem;
    }

    /* 單一按鍵 */
    #auth-gate .key {
      width: 46px;
      height: 46px;
      background: transparent;
      border: 1px solid #585245;
      border-radius: 50%;
      color: #7a7570;
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    #auth-gate .key:active,
    #auth-gate .key.pressed {
      background: #1e1c18;
      color: #e8e2d9;
      border-color: #3a3530;
    }

    #auth-gate .key.del {
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      color: 585245;
      border-color: transparent;
    }

    #auth-gate .key.del:active,
    #auth-gate .key.del.pressed {
      background: transparent;
      border-color: #1e1c18;
      color: #9a9490;
    }

    /* 錯誤文字 */
    #auth-gate .gate-error {
      margin-top: 1.6rem;
      font-size: 0.58rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: transparent;
      transition: color 0.3s;
      height: 0.9rem;
      font-family: 'Noto Serif TC', serif;
    }

    #auth-gate .gate-error.show {
      color: #7a4040;
    }

    /* 解鎖退場 */
    #auth-gate.unlocking {
      animation: gateOut 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
    }

    @keyframes gateOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }

    /* 內容進場 */
    .page-inner.revealed {
      opacity: 1 !important;
      pointer-events: auto !important;
      user-select: auto !important;
      animation: contentReveal 0.75s cubic-bezier(0.16,1,0.3,1) both;
    }

    @keyframes contentReveal {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────
  const gate = document.createElement('div');
  gate.id = 'auth-gate';

  const row1 = [1, 2, 3, 4, 5];
  const row2 = [6, 7, 8, 9, 0];

  gate.innerHTML = `
    <p class="gate-hint-text">${hint}</p>

    <div class="gate-dots">
      ${Array.from({ length: 8 }, (_, i) =>
        `<div class="dot-slot" data-i="${i}"></div>`
      ).join('')}
    </div>

    <div class="keypad">
      <div class="key-row">
        ${row1.map(n => `<button class="key" data-key="${n}">${n}</button>`).join('')}
      </div>
      <div class="key-row">
        ${row2.map(n => `<button class="key" data-key="${n}">${n}</button>`).join('')}
        <button class="key del" data-key="del">⌫</button>
      </div>
    </div>

    <p class="gate-error" id="gate-error">密碼錯誤</p>
  `;
  document.body.appendChild(gate);

  // ── 邏輯 ────────────────────────────────
  let input = '';
  const maxLen = String(password).length;
  const slots  = gate.querySelectorAll('.dot-slot');
  const errorEl = gate.querySelector('#gate-error');

  function updateDots() {
    slots.forEach((s, i) => {
      s.classList.toggle('filled', i < input.length);
      s.classList.remove('error');
    });
  }

  function triggerError() {
    slots.forEach(s => {
      s.classList.remove('filled');
      s.classList.add('error');
    });
    errorEl.classList.add('show');
    setTimeout(() => {
      slots.forEach(s => s.classList.remove('error'));
      errorEl.classList.remove('show');
      input = '';
      updateDots();
    }, 750);
  }

  function tryUnlock() {
    if (input === String(password)) {
      sessionStorage.setItem('auth_' + pageKey, '1');
      gate.classList.add('unlocking');
      setTimeout(() => { gate.remove(); showContent(); }, 560);
    } else {
      triggerError();
    }
  }

  gate.addEventListener('click', e => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    const val = key.dataset.key;

    if (val === 'del') {
      input = input.slice(0, -1);
      updateDots();
      return;
    }

    if (input.length >= maxLen) return;
    input += val;

    key.classList.add('pressed');
    setTimeout(() => key.classList.remove('pressed'), 130);

    updateDots();
    if (input.length === maxLen) setTimeout(tryUnlock, 160);
  });

  // 實體鍵盤支援
  document.addEventListener('keydown', e => {
    if (!document.getElementById('auth-gate')) return;
    if (/^[0-9]$/.test(e.key)) {
      if (input.length < maxLen) {
        input += e.key;
        updateDots();
        if (input.length === maxLen) setTimeout(tryUnlock, 160);
      }
    } else if (e.key === 'Backspace') {
      input = input.slice(0, -1);
      updateDots();
    }
  });

  function showContent() {
    const inner = document.querySelector('.page-inner');
    if (inner) inner.classList.add('revealed');
  }
}
