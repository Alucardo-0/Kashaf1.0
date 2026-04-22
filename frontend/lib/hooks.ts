import { useCallback } from "react";

/**
 * A hook that returns a click handler for smooth scrolling to elements on the page.
 */
export function useSmoothScroll() {
    return useCallback((e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        // Only prevent default if it's an anchor link on the same page
        if (targetId.startsWith("#")) {
            e.preventDefault();
            const el = document.querySelector(targetId);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    }, []);
}
