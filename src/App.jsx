import { Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import { lazyWithRefresh } from "./lib/lazyWithRefresh";
const Landing = lazyWithRefresh(() => import("./pages/Landing"));
const ToolsOverview = lazyWithRefresh(() => import("./pages/ToolsOverview"));
const HowItWorks = lazyWithRefresh(() => import("./pages/HowItWorks"));
const Pricing = lazyWithRefresh(() => import("./pages/Pricing"));
const Workspace = lazyWithRefresh(() => import("./pages/Workspace"));
const Converter = lazyWithRefresh(() => import("./pages/Converter"));
const Invoice = lazyWithRefresh(() => import("./pages/Invoice"));
const Career = lazyWithRefresh(() => import("./pages/Career"));
const Auth = lazyWithRefresh(() => import("./pages/Auth"));
const Payment = lazyWithRefresh(() => import("./pages/Payment"));
const Admin = lazyWithRefresh(() => import("./pages/AdminControl"));
const Account = lazyWithRefresh(() => import("./pages/Account"));
const AccessMode = lazyWithRefresh(() => import("./pages/AccessMode"));
const NotFound = lazyWithRefresh(() => import("./pages/NotFound"));
const About = lazyWithRefresh(() => import("./pages/About"));
const DocumentEditor = lazyWithRefresh(() => import("./pages/DocumentEditor"));
const DocumentHistory = lazyWithRefresh(() => import("./pages/DocumentHistory"));
const Privacy = lazyWithRefresh(() => import("./pages/Privacy"));
const Terms = lazyWithRefresh(() => import("./pages/Terms"));
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
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/history" element={<DocumentHistory />} />
        <Route path="/account" element={<Account />} />
        <Route path="/access" element={<AccessMode />} />
        <Route path="/tools/convert" element={<Converter />} />
        <Route path="/tools/invoice" element={<Invoice />} />
        <Route path="/tools/career" element={<Career />} />
        <Route path="/tools/editor" element={<DocumentEditor />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
