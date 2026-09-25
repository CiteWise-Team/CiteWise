import { useEffect, useState } from "react";

export const MOBILE_QUERY = "(max-width: 768px)";
export const MOBILE_TABBAR_HEIGHT = 64;

// Most layouts are styled inline, which media queries cannot override, so
// components read the breakpoint from here and swap their layout values.
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
