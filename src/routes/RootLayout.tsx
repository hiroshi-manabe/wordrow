import { NavLink, Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-brand">
          <span className="app-brand__mark" aria-hidden="true">
            WR
          </span>
          <div>
            <p className="app-brand__eyebrow">Word-Order Trainer</p>
            <p className="app-brand__title">Practice Lab</p>
          </div>
        </div>
        <nav className="app-nav">
          <NavLink to="/" className="app-nav__link">
            Library
          </NavLink>
        </nav>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
