import { useEffect, useRef } from "react";

const isProcessing = () =>
  document.documentElement.classList.contains("is-processing");

export default function CustomCursor() {
  const cursor = useRef(null);
  const themeFrame = useRef(0);

  useEffect(() => {
    const element = cursor.current;
    if (!element || !window.matchMedia("(pointer: fine)").matches) return;
    let frame;
    const isDarkBackground = (target) => {
      let node = target instanceof Element ? target : target?.parentElement;
      const themed = node?.closest?.("[data-cursor-theme]");
      if (themed) return themed.dataset.cursorTheme === "dark";
      while (node && node !== document.documentElement) {
        const color = window.getComputedStyle(node).backgroundColor;
        const values = color.match(/[\d.]+/g)?.map(Number);
        if (values?.length >= 3 && (values[3] ?? 1) > 0.15) {
          const [red, green, blue] = values;
          const luminance =
            (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
          return luminance < 0.5;
        }
        node = node.parentElement;
      }
      return false;
    };

    const syncTheme = (x, y) => {
      cancelAnimationFrame(themeFrame.current);
      themeFrame.current = requestAnimationFrame(() => {
        const target = document.elementFromPoint(x, y);
        element.classList.toggle(
          "interactive",
          Boolean(target?.closest("a, button, input, textarea, select, label")),
        );
        element.classList.toggle("on-dark", isDarkBackground(target));
      });
    };

    const move = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        element.classList.add("visible");
        if (isProcessing()) {
          element.classList.remove("interactive", "on-dark");
          return;
        }
        syncTheme(event.clientX, event.clientY);
      });
    };
    const leave = () => element.classList.remove("visible");
    const down = () => element.classList.add("pressed");
    const up = () => element.classList.remove("pressed");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(themeFrame.current);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return <span ref={cursor} className="custom-cursor" aria-hidden="true" />;
}
