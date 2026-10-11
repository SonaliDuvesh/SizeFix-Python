import React from "react";
import { Moon, Sun, HelpCircle, ShieldCheck, Cpu } from "lucide-react";

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleTheme,
  onOpenHelp,
}) => {
  return (
    <header className="box-card mb-6" style={{ padding: "1rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              background: "var(--strong-raspberry)",
              color: "#FFFFFF",
              padding: "0.4rem 0.75rem",
              fontWeight: 900,
              fontSize: "1.4rem",
              letterSpacing: "0.08em",
              border: "2px solid var(--border-color)",
              boxShadow: "2px 2px 0px var(--border-color)"
            }}>
              SizeFix-Python
            </div>
            <span style={{ fontSize: "1.2rem", color: "var(--strong-raspberry)" }}>✦</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--secondary-text)" }}>
              Resize. Compress. Convert. Done.
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px", flexWrap: "wrap" }}>
              <span className="sharp-tag sharp-tag-success" style={{ fontSize: "0.7rem" }}>
                <ShieldCheck size={12} /> Local-First & Private
              </span>
              <span className="sharp-tag" style={{ fontSize: "0.7rem" }}>
                <Cpu size={12} /> Python FastAPI Engine
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ padding: "0.5rem 0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span style={{ fontSize: "0.8rem" }}>{darkMode ? "LIGHT" : "DARK"}</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="btn-secondary"
            title="Help & Documentation"
            style={{ padding: "0.5rem 0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <HelpCircle size={16} />
            <span style={{ fontSize: "0.8rem" }}>DOCS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
