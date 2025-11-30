import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import NewsletterBox from '../components/NewsletterBox';

const About = () => {
  return(
   
    <div>
      
      
      <div className='text-2x1 text-center pt-8 border-t'>
        <Title text1={'ABOUT'} text2={'US'} />
      </div>
      
      <div className='my-10 flex flex-col md:flex-row gap-16'>
        <img className='w-full md:max-w-[450px]' src={assets.about_img} alt="" />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
          <p>We are an online shopping platform focused on providing quality products at fair prices. Our goal is to make your shopping experience simple, fast, and reliable, with secure payments and quick delivery.</p>
          <p>We bring a curated collection of everyday essentials and trending products to your doorstep. Our focus is on trust, transparency, and customer satisfaction, making sure you get what you need without hassle.</p>
          <b className='text-gray-800'>Our Mission</b>
          <p>Our mission is to provide a smooth, affordable, and trustworthy online shopping experience for everyone. We aim to deliver quality products, fast service, and consistent customer support that values your time and money.</p>
        </div>
      </div>
      <div className=' text-xl py-4'>
        <Title text1={'WHY'} text2={'CHOOSE US'} />
      </div>
        <div className='flex flex-col md:flex-row text-sm mb-20'>
          <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
            <b>Quality Assurance:</b>
            <p className='text-gray-600'>We meticulously select and vet each product to ensure it meets our stringent quality standards. Every item is inspected for durability, usability, and value before it reaches you, so you only receive products you can trust.</p>
          </div>
            <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
              <b>Convenience:</b>
              <p lassName='text-gray-600'>We make shopping quick and hassle-free with an easy interface, secure payments, and fast delivery. You can browse, order, and track your products anytime, from anywhere, without unnecessary steps or delays.</p>
            </div>
            <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
              <b>Exceptional Customer service:</b>
              <p lassName='text-gray-600'>We are committed to helping you at every step, from product selection to after-sales assistance. Our support team responds quickly and works to resolve issues clearly and efficiently, ensuring a smooth and reliable shopping experience.</p>
            </div>
        </div>
        <NewsletterBox/>
    </div>
  )

}

export default About
