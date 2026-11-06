
import { useEffect, useRef } from 'react';

const usePolling = (fn, intervalMs, active = true) => {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => fnRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
};

export default usePolling;