import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import { formatPrice } from '../utils/currency';

const CartTotal = () => {
    const {currency, delivery_fee, getCartAmount} = useContext(ShopContext);
    const subtotal = getCartAmount();
    const shipping = subtotal === 0 ? 0 : delivery_fee;
    const money = (n) => formatPrice(n, currency);

    return (
    <div className='w-full'>
        <Title text1={'ORDER'} text2={'SUMMARY'} size='sm' />
        <dl className='mt-4 flex flex-col text-sm'>
            <div className='flex justify-between border-b border-neutral-200 py-3'>
                <dt className='text-neutral-600'>Subtotal</dt>
                <dd className='text-ink'>{money(subtotal)}</dd>
            </div>
            <div className='flex justify-between border-b border-neutral-200 py-3'>
                <dt className='text-neutral-600'>Shipping</dt>
                <dd className='text-ink'>{money(shipping)}</dd>
            </div>
            <div className='flex justify-between py-4 text-base'>
                <dt className='font-medium text-ink'>Total</dt>
                <dd className='font-medium text-ink'>{money(subtotal + shipping)}</dd>
            </div>
        </dl>
    </div>
)

}
export default CartTotal
