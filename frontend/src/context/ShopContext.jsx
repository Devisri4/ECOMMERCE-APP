import React, { createContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { friendlyError } from '../utils/messages';

export const ShopContext = createContext();

// Logged-out shoppers keep their cart in localStorage until they sign in
const GUEST_CART_KEY = 'guestCart';
const readGuestCart = () => {
    try {
        return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || {};
    } catch {
        return {};
    }
};

const ADDED_TOAST_ID = 'added-to-bag';

// Session-expiry interceptor is registered at module load (not in an effect) so it also covers
// requests pages send on first render — React runs child effects before the provider's.
let onSessionExpired = () => {};
axios.interceptors.response.use((res) => {
    if (res.config?.headers?.token && res.data?.success === false && res.data?.message === 'Not Authorized Login Again') {
        onSessionExpired();
    }
    return res;
});

const ShopContextProvider = ({ children }) => {
    const currency = '$';
    const delivery_fee = 10;

    // backend URL with fallback
    const backendUrl =
        import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState(false);
    // Read the token on first render so pages that require login don't see a false "logged out" state on refresh
    const [token, setToken] = useState(() => localStorage.getItem('token') || '');
    const [cartItems, setCartItems] = useState(() => (localStorage.getItem('token') ? {} : readGuestCart()));
    const [cartLoaded, setCartLoaded] = useState(false);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const navigate = useNavigate();

    /* ---------------- PRODUCTS ---------------- */
    const getProductsData = async () => {
        setProductsLoading(true);
        setProductsError(false);
        try {
            const res = await axios.get(backendUrl + '/api/product/list');
            if (res.data.success) {
                setProducts(res.data.products);
            } else {
                setProductsError(true);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            setProductsError(true);
        } finally {
            setProductsLoading(false);
        }
    };

    useEffect(() => {
        getProductsData();
    }, []);

    /* ---------------- SESSION EXPIRY ---------------- */
    // If any authenticated call says the session is no longer valid (expired/invalid token),
    // sign out locally so the UI doesn't stay in a broken "logged in" state.
    useEffect(() => {
        onSessionExpired = () => {
            localStorage.removeItem('token');
            setToken('');
            setCartItems({});
            toast.error('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
        };
        return () => { onSessionExpired = () => {}; };
    }, []);

    /* ---------------- CART ---------------- */
    const getUserCart = async (currentToken) => {
        try {
            const res = await axios.post(
                backendUrl + '/api/cart/get',
                {},
                { headers: { token: currentToken } }
            );
            if (res.data.success) {
                const merged = structuredClone(res.data.cartData || {});
                const guestCart = readGuestCart();
                const updates = [];

                // Carry items added before signing in over to the account cart
                for (const itemId in guestCart) {
                    for (const size in guestCart[itemId]) {
                        const qty = guestCart[itemId][size];
                        if (qty > 0) {
                            if (!merged[itemId]) merged[itemId] = {};
                            merged[itemId][size] = (merged[itemId][size] || 0) + qty;
                            updates.push({ itemId, size, quantity: merged[itemId][size] });
                        }
                    }
                }

                setCartItems(merged);

                // Sequential: each update rewrites the whole server cart, so parallel calls would race
                for (const update of updates) {
                    await axios.post(backendUrl + '/api/cart/update', update, { headers: { token: currentToken } });
                }
                localStorage.removeItem(GUEST_CART_KEY);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setCartLoaded(true);
        }
    };

    useEffect(() => {
        if (token) {
            getUserCart(token);
        } else {
            setCartItems(readGuestCart());
            setCartLoaded(true);
        }
    }, [token]);

    // Persist the guest cart so it survives refreshes and navigation
    useEffect(() => {
        if (token) return;
        try {
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
        } catch {
            // storage unavailable (e.g. private mode) — cart still works for this visit
        }
    }, [cartItems, token]);

    const showAddedToast = (itemId, size) => {
        const product = products.find((p) => p._id === itemId);
        const content = (
            <div>
                <p className="text-sm font-medium">Added to your bag</p>
                {product && (
                    <p className="mt-0.5 text-xs text-neutral-500">{product.name} · Size {size}</p>
                )}
            </div>
        );
        if (toast.isActive(ADDED_TOAST_ID)) {
            toast.update(ADDED_TOAST_ID, { render: content, autoClose: 2500 });
        } else {
            toast.success(content, { toastId: ADDED_TOAST_ID, autoClose: 2500 });
        }
    };

    const addToCart = async (itemId, size) => {
        if (!size) {
            toast.error('Please select a size to continue.', { toastId: 'select-size' });
            return;
        }

        // Server rejects quantities above 99 per size (orderController.buildOrderItems)
        if ((cartItems[itemId]?.[size] || 0) >= 99) {
            toast.error('You can add up to 99 of each item.', { toastId: 'max-qty' });
            return;
        }

        // functional update so quick repeated clicks are all counted
        setCartItems((prev) => {
            const copy = structuredClone(prev);
            if (!copy[itemId]) copy[itemId] = {};
            copy[itemId][size] = (copy[itemId][size] || 0) + 1;
            return copy;
        });
        showAddedToast(itemId, size);

        if (token) {
            try {
                const res = await axios.post(
                    backendUrl + '/api/cart/add',
                    { itemId, size },
                    { headers: { token } }
                );
                if (!res.data.success) toast.error(friendlyError(res.data.message, 'We couldn’t add this item to your bag. Please try again.'));
            } catch (error) {
                console.log(error);
                toast.error(friendlyError(error, 'We couldn’t add this item to your bag. Please try again.'));
            }
        }
    };

    const updateQuantity = async (itemId, size, qty) => {
        const copy = structuredClone(cartItems);
        if (!copy[itemId]) return;

        if (qty > 0) {
            copy[itemId][size] = qty;
        } else {
            delete copy[itemId][size];
            if (Object.keys(copy[itemId]).length === 0) {
                delete copy[itemId];
            }
        }

        setCartItems(copy);

        if (token) {
            try {
                await axios.post(
                    backendUrl + '/api/cart/update',
                    { itemId, size, quantity: qty },
                    { headers: { token } }
                );
            } catch (error) {
                console.log(error);
                toast.error(friendlyError(error, 'We couldn’t update your bag. Please try again.'));
            }
        }
    };

    const getCartCount = () =>
        Object.values(cartItems).reduce(
            (sum, sizes) =>
                sum +
                Object.values(sizes).reduce((a, b) => a + b, 0),
            0
        );

    const getCartAmount = () =>
        Object.entries(cartItems).reduce((total, [id, sizes]) => {
            const product = products.find((p) => p._id === id);
            if (!product) return total;
            return (
                total +
                Object.entries(sizes).reduce(
                    (s, [, q]) => s + product.price * q,
                    0
                )
            );
        }, 0);

    /* ---------------- LOGOUT ---------------- */
    const logout = () => {
        navigate('/login');
        localStorage.removeItem('token');
        setToken('');
        setCartItems({});
        toast.success('You’ve been signed out.');
    };

    /* ---------------- CONTEXT ---------------- */
    return (
        <ShopContext.Provider value={{
    products,
    productsLoading,
    productsError,
    getProductsData,
    cartItems,
    setCartItems,   // ✅ MUST BE HERE
    currency,
    delivery_fee,
    addToCart,
    updateQuantity,
    getCartCount,
    getCartAmount,
    cartLoaded,
    token,
    setToken,
    logout,
    navigate,
    backendUrl,
    search,
    setSearch,
    showSearch,
    setShowSearch
}}>

           {children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
