import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useNavCounts from '../utils/useNavCounts'
import Icon from './Icon'
import { getTabs, tabMatches, hidesTabBar } from './appTabs'

// Barre d'onglets du bas : le repère principal d'une vraie app mobile.
export default function BottomTabBar() {
  const { user, agency, traveler } = useAuth()
  const { pathname } = useLocation()
  const counts = useNavCounts()
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Masquée quand le clavier est ouvert (sinon elle remonte au-dessus).
  useEffect(() => {
    const isField = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
    const onIn = (e) => { if (isField(e.target)) setKeyboardOpen(true) }
    const onOut = () => setTimeout(() => { if (!isField(document.activeElement)) setKeyboardOpen(false) }, 100)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut) }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('kb-open', keyboardOpen)
  }, [keyboardOpen])

  if (hidesTabBar(pathname) || keyboardOpen) return null
  const tabs = getTabs({ user, agency, traveler })

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-ink text-paper border-t border-paper/10 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <ul className="flex h-16">
        {tabs.map(tab => {
          const active = tabMatches(tab, pathname)
          const badge = tab.badge ? counts[tab.badge] : 0
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to} end={tab.exact}
                className="tap h-full flex flex-col items-center justify-center gap-0.5"
                aria-current={active ? 'page' : undefined}
              >
                <span className={`relative px-4 py-1 rounded-full transition-colors ${active ? 'bg-orange/20 text-orange' : 'text-paper/60'}`}>
                  <Icon name={tab.icon} active={active} className="w-6 h-6" />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] font-medium leading-none ${active ? 'text-orange' : 'text-paper/60'}`}>{tab.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
