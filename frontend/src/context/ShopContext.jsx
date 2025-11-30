import React, { createContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const ShopContext = createContext();

const ShopContextProvider = ({ children }) => {
    const currency = '$';
    const delivery_fee = 10;

    // backend URL with fallback
    const backendUrl =
        import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState({});
    const [token, setToken] = useState('');
    const [cartLoaded, setCartLoaded] = useState(false);

    const navigate = useNavigate();

    /* ---------------- PRODUCTS ---------------- */
    const getProductsData = async () => {
        const res = await axios.get(backendUrl + '/api/product/list');
        if (res.data.success) {
            setProducts(res.data.products);
        }
    };

    useEffect(() => {
        getProductsData();
    }, []);

    /* ---------------- AUTH ---------------- */
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) setToken(savedToken);
        else setCartLoaded(true);
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
                setCartItems(res.data.cartData || {});
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
            setCartItems({});
            setCartLoaded(true);
        }
    }, [token]);

    const addToCart = async (itemId, size) => {
        if (!size) {
            toast.error('Select Product Size');
            return;
        }

        const copy = structuredClone(cartItems);
        if (!copy[itemId]) copy[itemId] = {};
        copy[itemId][size] = (copy[itemId][size] || 0) + 1;
        setCartItems(copy);

        if (token) {
            await axios.post(
                backendUrl + '/api/cart/add',
                { itemId, size },
                { headers: { token } }
            );
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
            await axios.post(
                backendUrl + '/api/cart/update',
                { itemId, size, quantity: qty },
                { headers: { token } }
            );
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

    /* ---------------- CONTEXT ---------------- */
    return (
        <ShopContext.Provider value={{
    products,
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
    navigate,
    backendUrl
}}>

           {children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
