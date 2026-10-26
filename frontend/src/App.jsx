import React, { useEffect } from 'react';
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Collection from "./pages/Collection";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import PlaceOrder from "./pages/PlaceOrder";
import Orders from "./pages/Orders";
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Notice: no BrowserRouter here
import Footer from './components/Footer';
import SearchBar from './components/SearchBar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';

const App = () => {
  const { pathname } = useLocation();

  // Start each new page at the top instead of keeping the previous scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      {/* One quiet style for every notification — see .Toastify overrides in index.css */}
      <ToastContainer position="bottom-right" hideProgressBar autoClose={3000} icon={false} newestOnTop limit={3} />
      <Navbar />
      <main id="main-content" className="page-container flex-1">
        <SearchBar />
        {/* Keyed by path so each page fades in on navigation */}
        <div key={pathname} className="page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:productId" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/place-order" element={<PlaceOrder />} />
          <Route path="/orders" element={<Orders />} />
          {/* Stripe returns via the backend (/api/order/verifyStripe), so the old /verify page is gone */}
          <Route path="/verify" element={<Navigate to="/orders" replace />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/account" element={<Account />} />
        </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
