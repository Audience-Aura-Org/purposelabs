import { Poppins, Quicksand } from 'next/font/google';
import './globals.css';
import './theme.css';
import { brand } from '@/lib/config';
import CartProvider from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Enhancer from '@/components/Enhancer';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });
const quicksand = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-quicksand', display: 'swap' });

export const metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: `${brand.name} | ${brand.tagline}`, template: '%s' },
  openGraph: { siteName: brand.name, locale: 'en_AU', type: 'website' },
  icons: { icon: '/assets/brand/mark.svg' },
};

// viewport-fit=cover lets env(safe-area-inset-*) keep UI clear of the notch / home bar.
export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU" className={`${poppins.variable} ${quicksand.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <CartProvider>
          <Header brandName={brand.name} />
          <main id="main">{children}</main>
          <Footer />
          <Enhancer />
        </CartProvider>
      </body>
    </html>
  );
}
