import Link from "next/link";
import { PwaRegister } from "./pwa";
import { APP_NAME } from "@/lib/constants";

const LINKS = [
  { href: "/", label: "Glance" },
  { href: "/observe", label: "Leave a note" },
  { href: "/about", label: "About" },
];

export function Shell({
  active,
  children,
}: {
  active: "glance" | "observe" | "about" | "admin";
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip" href="#reading">
        Skip to today&apos;s reading
      </a>
      <PwaRegister />
      <div className={active === "glance" ? "sheet-wrap glance-wrap" : "sheet-wrap"}>
        <p id="offline-flag" className="offline-flag" hidden>
          No signal. This is the last sheet the phone saved — tide, weather, and the wall reading from
          that fetch.
        </p>
        {active === "glance" ? (
          children
        ) : (
          <div className="sheet page">
            <header className="folio mast">
              <Masthead active={active} />
            </header>
            <div id="reading" className="page-reading">
              {children}
            </div>
            <aside className="folio folio-extra">
              <PlateKey />
            </aside>
          </div>
        )}
      </div>
      <footer className="site-footer">
        <p>
          {APP_NAME} — a placeholder name for a notebook about one pool. Swim at your own risk.
        </p>
        <p>
          Skin: Tributary, shared by Kem at Glitch Cat Club. The notebook look is his design; this
          page only borrows it.{" "}
          <Link href="/about">About the sheet, the sources, and the credit.</Link>
        </p>
        <p>
          <Link href="/admin">Keeper&apos;s desk</Link>
        </p>
      </footer>
    </>
  );
}

export function Masthead({ active }: { active: "glance" | "observe" | "about" | "admin" }) {
  return (
    <>
      <p className="kicker">Walpole Bay · Margate</p>
      <p className="wordmark">Conditions</p>
      <p className="plate">plate v1 of the conditions notebook</p>
      <nav className="nav" aria-label="Sections">
        {LINKS.map((link) => {
          const current =
            (active === "glance" && link.href === "/") ||
            (active === "observe" && link.href === "/observe") ||
            (active === "about" && link.href === "/about");
          return (
            <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function PlateKey() {
  return (
    <div className="plate-key-body">
      <h2>Key to the marks</h2>
      <ul className="rule-list">
        <li>
          <i className="swatch now" />
          <span>coral line — now</span>
        </li>
        <li>
          <i className="swatch" />
          <span>open band — walls exposed</span>
        </li>
        <li>
          <i className="swatch near" />
          <span>hatch — water near the top</span>
        </li>
        <li>
          <i className="swatch fall" />
          <span>coral — magic waterfall time</span>
        </li>
        <li>
          <i className="swatch cover" />
          <span>solid — walls covered</span>
        </li>
      </ul>
      <p className="fine">51.39292°N, 1.40422°E · CT9. One site. English only.</p>
    </div>
  );
}
