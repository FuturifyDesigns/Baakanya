import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { AccessProvider } from "./lib/access";
import { LanguageProvider } from "./lib/i18n";
import { ToastProvider } from "./lib/toast";
import { recoverFromOutdatedChunk } from "./lib/lazyWithRefresh";
import "./styles.css";

window.addEventListener("vite:preloadError", (event) => {
  if (recoverFromOutdatedChunk(event.payload)) event.preventDefault();
});

sessionStorage.removeItem("baakanya-html-reload");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <LanguageProvider>
        <AuthProvider>
          <AccessProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AccessProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
