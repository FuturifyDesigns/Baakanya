import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
const Landing = lazy(() => import("./pages/Landing"));
const ToolsOverview = lazy(() => import("./pages/ToolsOverview"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Converter = lazy(() => import("./pages/Converter"));
const Invoice = lazy(() => import("./pages/Invoice"));
const Career = lazy(() => import("./pages/Career"));
const Auth = lazy(() => import("./pages/Auth"));
const Payment = lazy(() => import("./pages/Payment"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <Suspense
      fallback={
        <div className="page-loader">
          <span />
        </div>
      }
    >
      <CustomCursor />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tools" element={<ToolsOverview />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/tools/convert" element={<Converter />} />
        <Route path="/tools/invoice" element={<Invoice />} />
        <Route path="/tools/career" element={<Career />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
