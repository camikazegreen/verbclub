import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Header />
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  )
} 