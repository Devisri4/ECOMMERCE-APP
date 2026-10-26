import React from 'react';
import { PASSWORD_RULES } from '../utils/passwordRules';

// Live list of password requirements; each rule ticks as it is met
const PasswordChecklist = ({ id, password }) => (
  <ul id={id} className='mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2' aria-label='Password requirements'>
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <li key={rule.label} className={`flex items-center gap-2 ${met ? 'text-ink' : 'text-neutral-500'}`}>
          <span
            aria-hidden='true'
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] leading-none ${met ? 'border-ink bg-ink text-white' : 'border-neutral-300'}`}
          >
            {met ? '✓' : ''}
          </span>
          {rule.label}
          <span className='sr-only'>{met ? '(met)' : '(not met)'}</span>
        </li>
      );
    })}
  </ul>
);

export default PasswordChecklist;
