import { MouseGlow } from "@/components/drivya/MouseGlow";
import { DashboardLayout } from "./components/dashboard/Dashboard";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import MyDrive from "./pages/MyDrive";
import Auth from "./pages/Auth";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

export default function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <LandingPage />
    },
    {
      path: '/auth',
      element: <Auth />
    },
    {
      path: '/dashboard',
      element: <DashboardLayout />,
      children: [
        { index: true, element: <Navigate to="home" replace /> },
        { path: 'home', element: <Home /> },
        { path: 'drive', element: <MyDrive /> },
      ],
    },
  ]);
  return (
    <main className="relative  overflow-hidden">
      <MouseGlow />
      {/* <LandingPage/> */}
    <RouterProvider router={router}></RouterProvider>
    </main>
  );
}
