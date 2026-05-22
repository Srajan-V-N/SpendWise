import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import WiseBot from '../wisebot/WiseBot'

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gradient-page)', backgroundAttachment: 'fixed' }}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? 72 : 240,
        transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', minWidth: 0,
      }}
        className="layout-main"
      >
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          onMobileMenuOpen={() => setMobileSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main style={{
          flex: 1,
          padding: '0',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>

      <WiseBot />

      <style>{`
        @media (max-width: 768px) {
          .layout-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
