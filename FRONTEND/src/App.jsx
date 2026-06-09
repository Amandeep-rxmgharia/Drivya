import { lazy, Suspense } from "react";
import { MouseGlow } from "@/components/drivya/MouseGlow";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import Home from './pages/Home'
const DashboardLayout = lazy(() =>
  import("./components/dashboard/Dashboard").then((m) => ({
    default: m.DashboardLayout,
  })),
);
const LandingPage = lazy(() => import("./pages/LandingPage"));
// const Home = lazy(() => import("./pages/Home"));
const MyDrive = lazy(() => import("./pages/MyDrive"));
const Auth = lazy(() => import("./pages/Auth"));
const SharedFiles = lazy(() => import("./pages/SharedFiles"));
const RecentFiles = lazy(() => import("./pages/RecentFiles"));
const StarredFiles = lazy(() => import("./pages/StarredFiles"));
const TrashFiles = lazy(() => import("./pages/TrashFiles"));
const Settings = lazy(() => import("./pages/Settings"));
const Payment = lazy(() => import("./pages/Payment"));

export default function App() {
  const router = createBrowserRouter([
    {
      element: (
        <>
          <ScrollToTop />
          <Outlet />
        </>
      ),
      children: [
        {
          path: "/",
          element: (
            <Suspense fallback={null}>
              <LandingPage />
            </Suspense>
          ),
        },
        {
          path: "/auth",
          element: (
            <Suspense fallback={null}>
              <Auth />
            </Suspense>
          ),
        },
        {
          path: "/dashboard",
          element: (
            <Suspense fallback={null}>
              <DashboardLayout />
            </Suspense>
          ),
          children: [
            { index: true, element: <Navigate to="home" replace /> },
            {
              path: "home",
              element: (
                <Suspense fallback={null}>
                  <Home />
                </Suspense>
              ),
            },
            {
              path: "drive",
              element: (
                <Suspense fallback={null}>
                  <MyDrive />
                </Suspense>
              ),
            },
            {
              path: "shared",
              element: (
                <Suspense fallback={null}>
                  <SharedFiles />
                </Suspense>
              ),
            },
            {
              path: "recent",
              element: (
                <Suspense fallback={null}>
                  <RecentFiles />
                </Suspense>
              ),
            },
            {
              path: "starred",
              element: (
                <Suspense fallback={null}>
                  <StarredFiles />
                </Suspense>
              ),
            },
            {
              path: "trash",
              element: (
                <Suspense fallback={null}>
                  <TrashFiles />
                </Suspense>
              ),
            },
            {
              path: "settings",
              element: (
                <Suspense fallback={null}>
                  <Settings />
                </Suspense>
              ),
            },
            {
              path: "settings/:section",
              element: (
                <Suspense fallback={null}>
                  <Settings />
                </Suspense>
              ),
            },
            {
              path: "payment",
              element: (
                <Suspense fallback={null}>
                  <Payment />
                </Suspense>
              ),
            },
          ],
        },
      ],
    },
  ]);
  return (
    <main className="relative  overflow-hidden">
      <MouseGlow />
      <RouterProvider router={router}></RouterProvider>
    </main>
  );
}
