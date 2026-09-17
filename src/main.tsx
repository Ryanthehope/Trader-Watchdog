import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { MetaPixel } from "./components/MetaPixel";
import { CookieBanner } from "./components/CookieBanner";
import { SiteDataProvider } from "./context/SiteDataContext";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteDataProvider>
        <GoogleAnalytics />
        <MetaPixel />
        <App />
        <CookieBanner />
      </SiteDataProvider>
    </BrowserRouter>
  </StrictMode>
);
