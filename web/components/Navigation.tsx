'use client';
import { useState } from "react";

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="text-xl font-bold text-gray-900">
            Group Project
          </a>
          
          {/* Desktop Menu */}
          <div className="hidden sm:flex gap-6">
            <a href="/" className="text-gray-600 hover:text-gray-900 font-medium">Home</a>
            <a href="/groups" className="text-gray-600 hover:text-gray-900 font-medium">My Groups</a>
            <a href="/create" className="text-gray-600 hover:text-gray-900 font-medium">Create</a>
            <a href="/join" className="text-gray-600 hover:text-gray-900 font-medium">Join</a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <div 
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-2 space-y-1 border-t border-gray-200">
            <a 
              href="/" 
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </a>
            <a 
              href="/groups" 
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              My Groups
            </a>
            <a 
              href="/create" 
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Create Group
            </a>
            <a 
              href="/join" 
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Join Group
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
