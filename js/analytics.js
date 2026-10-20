// Google Analytics 4. Paste your Measurement ID below
// (GA4 → Admin → Data streams → your web stream → "Measurement ID").
const GA_ID = 'G-LK633G5T59';

window.dataLayer = window.dataLayer || [];
window.gtag = function () { dataLayer.push(arguments); };

if (/^G-[A-Z0-9]+$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX') {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID);
}

// Ecommerce events use GA4's recommended names so they fill the Monetization reports.
window.track = (name, params = {}) => gtag('event', name, { currency: 'INR', ...params });
