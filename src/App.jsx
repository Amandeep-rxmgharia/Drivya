import { lazy, Suspense } from "react";
import { MouseGlow } from "@/components/drivya/MouseGlow";
import { createBrowserRouter, Navigate, RouterProvider, Outlet } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

const DashboardLayout = lazy(() => import("./components/dashboard/Dashboard").then(m => ({ default: m.DashboardLayout })));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Home = lazy(() => import("./pages/Home"));
const MyDrive = lazy(() => import("./pages/MyDrive"));
const Auth = lazy(() => import("./pages/Auth"));

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
          path: '/',
          element: <Suspense fallback={null}><LandingPage /></Suspense>
        },
        {
          path: '/auth',
          element: <Suspense fallback={null}><Auth /></Suspense>
        },
        {
          path: '/dashboard',
          element: <Suspense fallback={null}><DashboardLayout /></Suspense>,
          children: [
            { index: true, element: <Navigate to="home" replace /> },
            { path: 'home', element: <Suspense fallback={null}><Home /></Suspense> },
            { path: 'drive', element: <Suspense fallback={null}><MyDrive /></Suspense> },
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
