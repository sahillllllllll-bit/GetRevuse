import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact" },
  ];

  // 🔥 Real auth state (NOT localStorage)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);



  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-white/80 backdrop-blur-lg shadow-md border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/">
          <div className="flex items-center gap-3">
            
            {/* Logo Image */}
            <img
              src="https://res.cloudinary.com/dmhykhefr/image/upload/v1776604024/Gemini_Generated_Image_jybr5pjybr5pjybr-removebg-preview_rlowjf.png"
              alt="GetRevuse logo"
              className="h-16 w-16 sm:h-16 sm:w-16 object-cover"
            />

            {/* Brand Name (hidden on mobile) */}
            <div className="hidden sm:block pacifico-regular text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-700 to-blue-400 bg-clip-text text-transparent tracking-tight">
              GetRevuse
            </div>

          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              to={link.href}
              className="text-gray-700 hover:text-blue-600 transition font-medium"
            >
              {link.name}
            </Link>
          ))}

          {/* Conditional CTA */}
          {!user ? (
            <button
              onClick={() => navigate("/login")}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-xl shadow-lg hover:scale-105 transition"
            >
              Get Started
            </button>
          ) : (
            <div className="flex items-center gap-3">
              
              {/* Dashboard Button (DIFFERENT STYLE) */}
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white border-2 border-blue-600 text-blue-600 px-5 py-2 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition"
              >
                Dashboard
              </button>

              {/* Logout */}
            </div>
          )}
        </div>

        {/* Mobile Button */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden bg-white border-t`}
      >
        <div className="flex flex-col px-6 py-4 gap-4">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              to={link.href}
              className="text-gray-700 hover:text-blue-600 font-medium"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}

          {!user ? (
            <button
              onClick={() => {
                navigate("/login");
                setIsOpen(false);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 rounded-xl shadow-md"
            >
              Get Started
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate("/dashboard");
                  setIsOpen(false);
                }}
                className="border-2 border-blue-600 text-blue-600 py-2 rounded-xl font-semibold"
              >
                Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}