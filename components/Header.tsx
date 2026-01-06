'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetchCartCount();
    
    // Refresh cart count when returning to the page
    const handleFocus = () => fetchCartCount();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [pathname]);

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      const count = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
      setCartCount(count);
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ShopHub
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/shop" className="text-gray-700 hover:text-gray-900 font-medium">
              Shop
            </Link>
            <Link href="/orders" className="text-gray-700 hover:text-gray-900 font-medium">
              Orders
            </Link>
            <Link href="/admin" className="text-gray-700 hover:text-gray-900 font-medium">
              Admin
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/login"
              className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Login"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
