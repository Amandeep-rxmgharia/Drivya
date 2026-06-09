import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
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
  }, [pathname]);

  return null;
}
