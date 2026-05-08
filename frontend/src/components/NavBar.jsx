import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, TrendingUp, User } from "lucide-react"

function NavBar() {
  const location = useLocation()
  const path = location.pathname

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around py-3 z-50">
        <Link to="/" className={`flex flex-col items-center gap-1 ${path === "/" ? "text-teal" : "text-gray-400"}`}>
          <Home size={20} />
          <span className="text-xs">Home</span>
        </Link>

        <Link to="/plan" className={`flex flex-col items-center gap-1 ${path === "/plan" ? "text-teal" : "text-gray-400"}`}>
          <BookOpen size={20} />
          <span className="text-xs">Plan</span>
        </Link>

        <Link to="/upload" className="-mt-4">
          <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-2xl">+</span>
          </div>
        </Link>

        <Link to="/timeline" className={`flex flex-col items-center gap-1 ${path === "/timeline" ? "text-teal" : "text-gray-400"}`}>
          <TrendingUp size={20} />
          <span className="text-xs">Timeline</span>
        </Link>

        <Link to="/profile" className={`flex flex-col items-center gap-1 ${path === "/profile" ? "text-teal" : "text-gray-400"}`}>
          <User size={20} />
          <span className="text-xs">Profile</span>
        </Link>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-52 bg-white border-r border-gray-200 px-4 py-6 z-50">
        <div className="mb-8">
          <h1 className="font-bold text-lg text-text-primary">Kinetic</h1>
          <p className="text-xs text-gray-400">AI Form Coach</p>
        </div>

        <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${path === "/" ? "bg-teal text-text-primary font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
          <Home size={18} />
          <span className="text-sm">Home</span>
        </Link>

        <Link to="/plan" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${path === "/plan" ? "bg-teal text-text-primary font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
          <BookOpen size={18} />
          <span className="text-sm">Plan</span>
        </Link>

        <Link to="/timeline" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${path === "/timeline" ? "bg-teal text-text-primary font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
          <TrendingUp size={18} />
          <span className="text-sm">Timeline</span>
        </Link>

        <Link to="/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${path === "/profile" ? "bg-teal text-text-primary font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
          <User size={18} />
          <span className="text-sm">Profile</span>
        </Link>

        <Link to="/upload" className="mt-4 flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg">
          <span className="text-lg">+</span>
          <span className="text-sm font-medium">New Upload</span>
        </Link>
      </nav>
    </>
  )
}

export default NavBar