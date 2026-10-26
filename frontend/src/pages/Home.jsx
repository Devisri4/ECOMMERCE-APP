import React from 'react'
import Hero from '../components/Hero'
import ShopByCategory from '../components/ShopByCategory'
import LatestCollection from '../components/LatestCollection'
import EditorialBanner from '../components/EditorialBanner'
import BestSeller from '../components/BestSeller'
import OurPolicy from '../components/OurPolicy'
import NewsletterBox from '../components/NewsletterBox'

const Home = () => {
  return (
    <div>
      <Hero />
      <ShopByCategory />
      <LatestCollection/>
      <EditorialBanner />
      <BestSeller/>
      <OurPolicy />
      <NewsletterBox />
    </div>
  )
}

export default Home
