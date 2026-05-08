"use client";

import { useState, useEffect } from "react";

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Hook to detect mobile/tablet viewport and touch capability.
 * SSR-safe: returns false defaults before hydration.
 */
export function useMobile(): MobileDetection {
  const [state, setState] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
  });

  useEffect(() => {
    const checkTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const mobileQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );
    const tabletQuery = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`
    );

    function update() {
      setState({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isTouch: checkTouch,
      });
    }

    update();

    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);

    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return state;
}
