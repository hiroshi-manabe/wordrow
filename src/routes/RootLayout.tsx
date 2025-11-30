import { Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="app-mobile">
      <main className="app-mobile__main">
        <Outlet />
      </main>
    </div>
  )
}
