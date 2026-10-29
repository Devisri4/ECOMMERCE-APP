import React, { createContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { friendlyError } from '../utils/messages';
import { STORE_CURRENCY } from '../utils/currency';
import { unitsLeft } from '../utils/stock';

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

// Same idea for the wishlist: a list of product ids kept in the browser until sign-in
const GUEST_WISHLIST_KEY = 'guestWishlist';
const readGuestWishlist = () => {
    try {
        const ids = JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY));
        return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
    } catch {
        return [];
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
    // Store currency + flat delivery charge (₹99) — must match backend/controllers/orderController.js
    const currency = STORE_CURRENCY;
    const delivery_fee = 99;

    // A deployed build never silently falls back to localhost: VITE_BACKEND_URL must be set in production
    const backendUrl = (
        import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')
    ).replace(/\/+$/, '');

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState(false);
    // Read the token on first render so pages that require login don't see a false "logged out" state on refresh
    const [token, setToken] = useState(() => localStorage.getItem('token') || '');
    const [cartItems, setCartItems] = useState(() => (localStorage.getItem('token') ? {} : readGuestCart()));
    const [cartLoaded, setCartLoaded] = useState(false);
    const [wishlist, setWishlist] = useState(() => (localStorage.getItem('token') ? [] : readGuestWishlist()));
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const navigate = useNavigate();

    /* ---------------- PRODUCTS ---------------- */
    const getProductsData = async () => {
        if (!backendUrl) {
            console.error('VITE_BACKEND_URL is not set for this build — the store cannot reach the API');
            setProductsError(true);
            setProductsLoading(false);
            return;
        }
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

    // Applies a change to one product in place (e.g. a new rating after a review) without reloading the catalogue
    const updateProduct = (id, patch) =>
        setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));

    /* ---------------- SESSION EXPIRY ---------------- */
    // If any authenticated call says the session is no longer valid (expired/invalid token),
    // sign out locally so the UI doesn't stay in a broken "logged in" state.
    useEffect(() => {
        onSessionExpired = () => {
            localStorage.removeItem('token');
            setToken('');
            setCartItems({});
            setWishlist([]);
            toast.error('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
        };
        return () => { onSessionExpired = () => {}; };
    }, []);

    /* ---------------- CART ---------------- */
    // Mirror of cartItems that is updated immediately (state updates only land on the next render),
    // so several quick "Add to bag" clicks are all checked against the stock limit
    const cartRef = useRef(cartItems);
    useEffect(() => { cartRef.current = cartItems; }, [cartItems]);

    // isCurrent() turns false if the shopper signs out (or the session ends) while this is loading,
    // so a late reply never puts account data back into the signed-out bag
    const getUserCart = async (currentToken, isCurrent) => {
        try {
            const res = await axios.post(
                backendUrl + '/api/cart/get',
                {},
                { headers: { token: currentToken } }
            );
            if (!isCurrent()) return;
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
                            // Same 99-per-size cap as the server (cartController / checkout)
                            merged[itemId][size] = Math.min((merged[itemId][size] || 0) + qty, 99);
                            updates.push({ itemId, size, quantity: merged[itemId][size] });
                        }
                    }
                }

                setCartItems(merged);
                if (updates.length === 0) return;

                // Sequential: each update rewrites the whole server cart, so parallel calls would race.
                // The server may refuse a line (e.g. less stock left than the guest bag held).
                const refused = [];
                for (const update of updates) {
                    const result = await axios.post(backendUrl + '/api/cart/update', update, { headers: { token: currentToken } });
                    if (!result.data.success) refused.push(result.data.message);
                }
                localStorage.removeItem(GUEST_CART_KEY);

                // Show exactly what the account bag now holds
                const saved = await axios.post(backendUrl + '/api/cart/get', {}, { headers: { token: currentToken } });
                if (!isCurrent()) return;
                if (saved.data.success) setCartItems(saved.data.cartData || {});
                if (refused.length) {
                    toast.info(friendlyError(refused[0], 'Some items from before you signed in couldn’t be added to your bag.'), { toastId: 'merge-refused' });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (isCurrent()) setCartLoaded(true);
        }
    };

    useEffect(() => {
        let active = true;
        if (token) {
            getUserCart(token, () => active);
        } else {
            setCartItems(readGuestCart());
            setCartLoaded(true);
        }
        return () => { active = false; };
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

    /* ---------------- SIGNED-IN SHOPPER ---------------- */
    // Name (and email) for the header's initials badge. Cleared on sign-out; the account page calls
    // setUser after the name is edited so the badge updates straight away.
    const [user, setUser] = useState(null);
    useEffect(() => {
        if (!token) {
            setUser(null);
            return;
        }
        let active = true;
        axios.post(backendUrl + '/api/user/profile', {}, { headers: { token } })
            .then((res) => { if (active && res.data.success) setUser(res.data.user); })
            .catch(() => {});
        return () => { active = false; };
    }, [token, backendUrl]);

    /* ---------------- WISHLIST ---------------- */
    // Signed in: load the account wishlist and add anything saved as a guest. Signed out: the browser copy.
    useEffect(() => {
        if (!token) {
            setWishlist(readGuestWishlist());
            return;
        }
        let active = true; // ignore the reply if the shopper signs out before it arrives
        const guest = readGuestWishlist();
        const request = guest.length
            ? axios.post(backendUrl + '/api/user/wishlist/merge', { productIds: guest }, { headers: { token } })
            : axios.post(backendUrl + '/api/user/wishlist', {}, { headers: { token } });
        request
            .then((res) => {
                if (!active || !res.data.success) return;
                setWishlist(res.data.wishlist);
                localStorage.removeItem(GUEST_WISHLIST_KEY);
            })
            .catch((err) => console.error(err));
        return () => { active = false; };
    }, [token, backendUrl]);

    useEffect(() => {
        if (token) return;
        try {
            localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlist));
        } catch {
            // storage unavailable — the wishlist still works for this visit
        }
    }, [wishlist, token]);

    const isInWishlist = (productId) => wishlist.includes(productId);

    // One request per product at a time: a double click can't send two toggles that land out of order
    const wishlistPending = useRef(new Set());

    const toggleWishlist = async (productId) => {
        if (wishlistPending.current.has(productId)) return;
        const adding = !wishlist.includes(productId);
        const previous = wishlist;
        setWishlist((prev) => (adding ? [...prev, productId] : prev.filter((id) => id !== productId)));
        toast.success(adding ? 'Saved to your wishlist.' : 'Removed from your wishlist.', { toastId: 'wishlist' });

        if (!token) return;
        wishlistPending.current.add(productId);
        try {
            const res = await axios.post(backendUrl + '/api/user/wishlist/toggle', { productId }, { headers: { token } });
            if (res.data.success) setWishlist(res.data.wishlist);
            else {
                setWishlist(previous);
                toast.error(friendlyError(res.data.message, 'We couldn’t update your wishlist. Please try again.'), { toastId: 'wishlist' });
            }
        } catch (error) {
            setWishlist(previous);
            toast.error(friendlyError(error, 'We couldn’t update your wishlist. Please try again.'), { toastId: 'wishlist' });
        } finally {
            wishlistPending.current.delete(productId);
        }
    };

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

    // Resolves to true when the item is in the bag (and, when signed in, saved), false if it was refused
    const addToCart = async (itemId, size) => {
        if (!size) {
            toast.error('Please select a size to continue.', { toastId: 'select-size' });
            return false;
        }

        // Server rejects quantities above 99 per size (orderController.buildOrderItems).
        // cartRef, not cartItems: it already counts clicks made before the last re-render.
        const inBag = cartRef.current[itemId]?.[size] || 0;
        if (inBag >= 99) {
            toast.error('You can add up to 99 of each item.', { toastId: 'max-qty' });
            return false;
        }
        const product = products.find((p) => p._id === itemId);
        const left = unitsLeft(product, size);
        if (inBag >= left) {
            toast.error(left === 0 ? 'This size is sold out.' : `Only ${left} left in this size.`, { toastId: 'stock-limit' });
            return false;
        }

        const next = structuredClone(cartRef.current);
        if (!next[itemId]) next[itemId] = {};
        next[itemId][size] = inBag + 1;
        cartRef.current = next;
        setCartItems(next);
        showAddedToast(itemId, size);

        if (token) {
            try {
                const res = await axios.post(
                    backendUrl + '/api/cart/add',
                    { itemId, size },
                    { headers: { token } }
                );
                if (!res.data.success) {
                    undoAdd(itemId, size);
                    toast.error(friendlyError(res.data.message, 'We couldn’t add this item to your bag. Please try again.'));
                    return false;
                }
            } catch (error) {
                console.error(error);
                undoAdd(itemId, size);
                toast.error(friendlyError(error, 'We couldn’t add this item to your bag. Please try again.'));
                return false;
            }
        }
        return true;
    };

    // Takes back an optimistic add the server refused, so the bag matches what is saved
    const undoAdd = (itemId, size) => {
        const copy = structuredClone(cartRef.current);
        if (!copy[itemId]?.[size]) return;
        copy[itemId][size] -= 1;
        if (copy[itemId][size] <= 0) delete copy[itemId][size];
        if (Object.keys(copy[itemId]).length === 0) delete copy[itemId];
        cartRef.current = copy;
        setCartItems(copy);
        toast.dismiss(ADDED_TOAST_ID);
    };

    const updateQuantity = async (itemId, size, qty) => {
        const previous = cartItems;
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
                const res = await axios.post(
                    backendUrl + '/api/cart/update',
                    { itemId, size, quantity: qty },
                    { headers: { token } }
                );
                // Refused (e.g. not enough stock): go back to what the server still has
                if (!res.data.success) {
                    setCartItems(previous);
                    toast.error(friendlyError(res.data.message, 'We couldn’t update your bag. Please try again.'));
                }
            } catch (error) {
                console.error(error);
                setCartItems(previous);
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
        setWishlist([]);
        toast.success('You’ve been signed out.');
    };

    /* ---------------- CONTEXT ---------------- */
    return (
        <ShopContext.Provider value={{
    products,
    productsLoading,
    productsError,
    getProductsData,
    updateProduct,
    cartItems,
    setCartItems,
    currency,
    delivery_fee,
    addToCart,
    updateQuantity,
    getCartCount,
    getCartAmount,
    cartLoaded,
    user,
    setUser,
    wishlist,
    isInWishlist,
    toggleWishlist,
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
