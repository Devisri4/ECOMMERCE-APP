import React from 'react'
import { assets } from '../assets/assets'

const policies = [
  {
    icon: assets.exchange_icon,
    title: 'Easy Exchange Policy',
    text: 'We offer hassle-free exchanges on eligible items.',
  },
  {
    icon: assets.quality_icon,
    title: '7 Days Return Policy',
    text: 'Return unused items with tags and original packaging within 7 days of delivery.',
  },
  {
    icon: assets.support_img,
    title: 'Customer Support',
    text: 'Our support team is here to help — reach out anytime for quick assistance.',
  },
]

const OurPolicy = () => {
  return (
    <section aria-label='Our promises' className='grid grid-cols-1 gap-12 border-y border-neutral-200 py-14 text-center sm:grid-cols-3 sm:gap-6 sm:py-16'>
      {policies.map((policy) => (
        <div key={policy.title} className='px-4'>
          <img src={policy.icon} className='mx-auto mb-5 w-9 opacity-80' alt='' />
          <h3 className='text-xs font-medium uppercase tracking-[0.18em] text-ink'>{policy.title}</h3>
          <p className='mx-auto mt-3 max-w-xs text-sm leading-relaxed text-neutral-500'>{policy.text}</p>
        </div>
      ))}
    </section>
  )
}

export default OurPolicy
