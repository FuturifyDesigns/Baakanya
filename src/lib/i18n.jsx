/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { english, setswana } from "./setswana";
const copy = {
  en: {
    tools: "Tools",
    pricing: "Pricing",
    how: "How it works",
    login: "Log in",
    start: "Start free",
    getStarted: "Get started",
    dashboard: "My workspace",
    about: "About",
    eyebrow: "Built in Botswana, for Botswana",
    hero: "Your documents, sorted.",
    sub: "Create polished documents, convert files and get application-ready — without the admin headache.",
    explore: "Explore the tools",
    trust: "7 days free · No card needed · Your files stay private",
  },
  tn: {
    tools: "Didiriswa",
    pricing: "Ditlhwatlhwa",
    how: "E bereka jang",
    login: "Tsena",
    start: "Simolola mahala",
    getStarted: "Simolola",
    dashboard: "Lefelo la me",
    about: "Ka ga rona",
    eyebrow: "E diretswe Botswana",
    hero: "Ditokomane tsa gago, di rulagantswe.",
    sub: "Dira ditokomane tsa maemo, fetola difaele mme o ipaakanyetse go romela — ntle le matsapa.",
    explore: "Bona didiriswa",
    trust:
      "Malatsi a le 7 mahala · Ga go tlhokege karata · Difaele tsa gago di sireletsegile",
  },
};
const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("baakanya-language") || "en",
  );
  const value = useMemo(
    () => ({
      language,
      t: copy[language],
      toggle: () =>
        setLanguage((current) => {
          const next = current === "en" ? "tn" : "en";
          localStorage.setItem("baakanya-language", next);
          return next;
        }),
    }),
    [language],
  );
  useEffect(() => {
    document.documentElement.lang = language === "tn" ? "tn" : "en";
    const dictionary = language === "tn" ? setswana : english;
    const translate = (root = document.body) => {
      if (!root) return;
      if (root.nodeType === Node.TEXT_NODE) {
        const trimmed = root.nodeValue.trim();
        if (
          trimmed &&
          !["SCRIPT", "STYLE", "TEXTAREA"].includes(
            root.parentElement?.tagName,
          ) &&
          dictionary[trimmed]
        ) {
          root.nodeValue = root.nodeValue.replace(trimmed, dictionary[trimmed]);
        }
        return;
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (
          ["SCRIPT", "STYLE", "TEXTAREA"].includes(node.parentElement?.tagName)
        )
          return;
        const trimmed = node.nodeValue.trim();
        if (!dictionary[trimmed]) return;
        node.nodeValue = node.nodeValue.replace(trimmed, dictionary[trimmed]);
      });
      root
        .querySelectorAll?.("[placeholder], [title], [aria-label]")
        .forEach((element) => {
          ["placeholder", "title", "aria-label"].forEach((attribute) => {
            const current = element.getAttribute(attribute);
            if (current && dictionary[current])
              element.setAttribute(attribute, dictionary[current]);
          });
        });
    };
    let frame = 0;
    const pendingRoots = new Set();
    const schedule = (root) => {
      if (root) pendingRoots.add(root);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const roots = [...pendingRoots];
        pendingRoots.clear();
        roots.forEach((pendingRoot) => translate(pendingRoot));
      });
    };
    schedule(document.body);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData") {
          schedule(record.target);
          return;
        }
        record.addedNodes.forEach((node) => schedule(node));
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      pendingRoots.clear();
    };
  }, [language]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
