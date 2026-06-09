import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const isSettingsPath = (path) => path.startsWith("/dashboard/settings");

    if (isSettingsPath(pathname) && isSettingsPath(prevPathname.current)) {
      prevPathname.current = pathname;
      return;
    }

    // Reset window scroll position
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // Reset dashboard scroll container if it exists
    const dashboardMain = document.querySelector(".dashboard-main");
    if (dashboardMain) {
      dashboardMain.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}
