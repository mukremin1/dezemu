// src/components/Header.tsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, User, Heart } from 'lucide-react'

export const Header = () => {
  const [time, setTime] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [cartCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const trTime = now.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      setTime(trTime)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setSearchTerm('')
    }
  }

  return (
    <header className="site-header">
      <div className="top-bar">
        <div className="user-info">
          <span className="time">Current time: {time}</span>
          <span className="country">Country: TR</span>
        </div>
        <Link to="/cart" className="cart-link">
          <ShoppingCart size={20} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>
      </div>

      <div className="main-nav">
        <Link to="/" className="logo">DEZEMU</Link>

        <form onSubmit={handleSearch} className="search-form">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </form>

        <div className="nav-icons">
          <button className="icon-btn" aria-label="Hesap">
            <User size={22} />
          </button>
          <button className="icon-btn" aria-label="Favoriler">
            <Heart size={22} />
          </button>
        </div>
      </div>
    </header>
  )
}
