import { useEffect, useRef, useState } from "react";

const SWIPE_CLOSE_DISTANCE = 96;
const SWIPE_CLOSE_VELOCITY = 0.5;
const SWIPE_MIN_DISTANCE = 16;

export function useSwipeDismiss(open: boolean, onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
      return;
    }
    const el = sheetRef.current;
    if (!el) return;

    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let distance = 0;
    let active = false;

    const reset = () => {
      active = false;
      distance = 0;
      setDragging(false);
      setDragY(0);
    };

    const handleStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = lastY = e.touches[0].clientY;
      lastTime = e.timeStamp;
      velocity = 0;
      distance = 0;
      active = false;
    };

    const handleMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        if (active) reset();
        return;
      }
      const y = e.touches[0].clientY;
      const elapsed = e.timeStamp - lastTime;
      if (elapsed > 0) velocity = (y - lastY) / elapsed;
      lastY = y;
      lastTime = e.timeStamp;

      if (!active) {
        // Engage only on a downward move that starts at the top of the scroll.
        if (y <= startY || el.scrollTop > 0) {
          startY = y;
          return;
        }
        active = true;
        setDragging(true);
      }

      const delta = y - startY;
      if (delta <= 0) {
        // Dragged back up past the origin: hand control back to scrolling.
        startY = y;
        reset();
        return;
      }
      distance = delta;
      e.preventDefault();
      setDragY(delta);
    };

    const handleEnd = () => {
      if (!active) return;
      const shouldClose =
        distance > SWIPE_CLOSE_DISTANCE ||
        (velocity > SWIPE_CLOSE_VELOCITY && distance > SWIPE_MIN_DISTANCE);
      reset();
      if (shouldClose) onCloseRef.current();
    };

    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleEnd);
    el.addEventListener("touchcancel", reset);
    return () => {
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleEnd);
      el.removeEventListener("touchcancel", reset);
    };
  }, [open]);

  return { sheetRef, dragY, dragging };
}
