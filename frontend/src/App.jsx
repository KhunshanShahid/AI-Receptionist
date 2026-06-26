import { useState } from 'react'
import Chat from './components/Chat'
import KnowledgeBase from './components/KnowledgeBase'
import CallDemo from './components/CallDemo'
import Admin from './components/Admin'
import './App.css'

const tabs = [
  { id: 'chat',      label: 'Chat',           icon: '💬' },
  { id: 'knowledge', label: 'Knowledge Base',  icon: '📚' },
  { id: 'call',      label: 'Call Demo',       icon: '🎙️' },
  { id: 'admin',     label: 'Admin',           icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-dot" />
          <span>AI Receptionist</span>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        {activeTab === 'chat'      && <Chat />}
        {activeTab === 'knowledge' && <KnowledgeBase />}
        {activeTab === 'call'      && <CallDemo />}
        {activeTab === 'admin'     && <Admin />}
      </main>
    </div>
  )
}
