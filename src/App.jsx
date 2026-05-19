import { MouseGlow } from "@/components/drivya/MouseGlow";
import { Dashboard } from "./components/dashboard/DashBoard";
// import { Dashboard2 } from "./components/dashboard/Dashboard2";
import LandingPage from "./pages/LandingPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

export default function App() {
 const router = createBrowserRouter([{
    path: '/',
    element: <LandingPage/>
  },{
    path: '/dashboard/home',
    element: <Dashboard/>
  }])
  return (
    <main className="relative  overflow-hidden">
      <MouseGlow />
      {/* <LandingPage/> */}
    <RouterProvider router={router}></RouterProvider>
    </main>
  );
}
