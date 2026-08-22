import { Link, useLocation } from "react-router-dom";

const tabs = [
  { href: "/workspace", label: "Tools" },
  { href: "/workspace/history", label: "History" },
];

export default function WorkspaceTabs() {
  const { pathname } = useLocation();

  return (
    <nav className="workspace-tabs" aria-label="Workspace sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          to={tab.href}
          className={pathname === tab.href ? "active" : ""}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
