import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const MAX_WARNING_BEFORE_MS = 60 * 1000; // warn up to 1 min before logout

/**
 * useIdleLogout
 * @param {Function} onLogout      — called when auto-logout fires
 * @param {Function} onWarn        — called when warning should appear (user can dismiss)
 * @param {Function} onWarnDismiss — ref-setter: call this to cancel warning + reset timer
 * @param {number}   timeoutMs     — total idle time before logout (default 15 min)
 * @param {boolean}  active        — enable or disable idle logout
 */
const useIdleLogout = (onLogout, onWarn, onWarnDismiss, timeoutMs = 15 * 60 * 1000, active = true) => {
  const timerRef   = useRef(null);
  const warningRef = useRef(null);
  const warnShown  = useRef(false);

  const doLogout = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(warningRef.current);
    onLogout();
  }, [onLogout]);

  const resetTimer = useCallback(() => {
    if (!active || !timeoutMs || timeoutMs <= 0) return;

    clearTimeout(timerRef.current);
    clearTimeout(warningRef.current);
    warnShown.current = false;

    const warningBeforeMs = timeoutMs > MAX_WARNING_BEFORE_MS
      ? MAX_WARNING_BEFORE_MS
      : Math.max(1000, Math.floor(timeoutMs / 2));

    warningRef.current = setTimeout(() => {
      if (warnShown.current) return;
      warnShown.current = true;
      onWarn(); // show custom modal
    }, Math.max(0, timeoutMs - warningBeforeMs));

    // Auto logout
    timerRef.current = setTimeout(doLogout, timeoutMs);
  }, [active, timeoutMs, doLogout, onWarn]);

  // Expose resetTimer so App.jsx can call it when user clicks "Stay logged in"
  useEffect(() => {
    if (typeof onWarnDismiss === 'function') onWarnDismiss(active ? resetTimer : undefined);
  }, [resetTimer, onWarnDismiss, active]);

  useEffect(() => {
    if (!active || !timeoutMs || timeoutMs <= 0) return;

    resetTimer();
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(warningRef.current);
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [resetTimer, active, timeoutMs]);
};

export default useIdleLogout;