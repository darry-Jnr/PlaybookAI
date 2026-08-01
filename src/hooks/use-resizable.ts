"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizableOptions {
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
}

export function useResizable({
  initialRatio = 50,
  minRatio = 25,
  maxRatio = 75,
}: UseResizableOptions = {}) {
  const [ratio, setRatio] = useState(initialRatio);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = window.innerWidth;
      const pct = (e.clientX / w) * 100;
      setRatio(Math.min(maxRatio, Math.max(minRatio, pct)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minRatio, maxRatio]);

  return { ratio, onMouseDown };
}
