import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursor = useRef(null);

  useEffect(() => {
    const element = cursor.current;
    if (!element || !window.matchMedia("(pointer: fine)").matches) return;
    let frame;
    const move = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        element.classList.add("visible");
        element.classList.toggle(
          "interactive",
          Boolean(
            event.target.closest("a, button, input, textarea, select, label"),
          ),
        );
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
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return <span ref={cursor} className="custom-cursor" aria-hidden="true" />;
}
