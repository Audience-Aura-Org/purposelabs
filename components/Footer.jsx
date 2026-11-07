import Link from 'next/link';
import Mark from './Mark';
import { brand } from '@/lib/config';
import { filterCategories } from '@/lib/catalog';

const EXPLORE = [
  ['/research/', 'Research Library'], ['/research-peptides-australia/', 'Research Peptides Australia'],
  ['/our-testing/', 'Our Testing'], ['/about-us/', 'About Us'], ['/affiliate-program/', 'Affiliate Program'],
];
const SUPPORT = [
  ['/contact/', 'Contact Us'], ['/track-order/', 'Track Order'], ['/shipping-policy/', 'Shipping Policy'],
  ['/refund-policy/', 'Refund Policy'], ['/terms-and-conditions/', 'Terms & Conditions'], ['/privacy-policy/', 'Privacy Policy'],
];

export default function Footer() {
  const SHOP = [['/shop/', 'All Peptides'], ...filterCategories().map((c) => [`/product-category/${c.slug}/`, c.name])];
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link className="wordmark wordmark--light" href="/"><Mark /><span className="wordmark__text">{brand.name}</span></Link>
            <p className="site-footer__notice">{brand.researchNotice}</p>
          </div>
          <nav className="site-footer__col" aria-label="Shop">
            <h2>Shop</h2>
            <ul>{SHOP.map(([h, l]) => <li key={h}><Link href={h}>{l}</Link></li>)}</ul>
          </nav>
          <nav className="site-footer__col" aria-label="Explore">
            <h2>Explore</h2>
            <ul>{EXPLORE.map(([h, l]) => <li key={h}><Link href={h}>{l}</Link></li>)}</ul>
          </nav>
          <nav className="site-footer__col" aria-label="Support">
            <h2>Support</h2>
            <ul>{SUPPORT.map(([h, l]) => <li key={h}><Link href={h}>{l}</Link></li>)}</ul>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <p>&copy; {new Date().getFullYear()} {brand.legalName}. All rights reserved.</p>
          <p>{brand.location}</p>
        </div>
      </div>
    </footer>
  );
}
