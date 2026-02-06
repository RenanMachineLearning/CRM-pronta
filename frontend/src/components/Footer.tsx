import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpenIcon, 
  LifebuoyIcon, 
  ShieldCheckIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const quickLinks: FooterLink[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Contatos', href: '/contacts' },
  { label: 'Empresas', href: '/companies' },
  { label: 'Leads', href: '/leads' },
  { label: 'Oportunidades', href: '/opportunities' },
];

const supportLinks: FooterLink[] = [
  { label: 'Documentação', href: '/docs/GUIA-USUARIO.html', external: true },
  { label: 'Central de Ajuda', href: '#', external: true },
  { label: 'Reportar Bug', href: '#', external: true },
  { label: 'Sugerir Funcionalidade', href: '#', external: true },
];

const legalLinks: FooterLink[] = [
  { label: 'Termos de Uso', href: '#' },
  { label: 'Política de Privacidade', href: '#' },
  { label: 'LGPD', href: '#' },
];

const appVersion = 'v1.0.0';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const renderLink = (link: FooterLink) => {
    const baseClasses = "text-sm text-text-secondary hover:text-primary-600 transition-colors duration-150";
    
    if (link.external) {
      return (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.label}
        to={link.href}
        className={baseClasses}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <footer className="bg-bg-surface border-t border-border-default">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xl font-bold text-text-primary">CRM SaaS</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Sistema completo de gestão de relacionamento com clientes. 
              Organize contatos, acompanhe leads e feche mais vendas.
            </p>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <HeartIcon className="w-4 h-4 text-error-500" />
              <span>Feito com dedicação para sua empresa</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Links Rápidos
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Suporte
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Contact & Version */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Informações
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <BookOpenIcon className="w-4 h-4 text-primary-500" />
                <span>Documentação completa disponível</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <LifebuoyIcon className="w-4 h-4 text-primary-500" />
                <span>Suporte técnico 24/7</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <ShieldCheckIcon className="w-4 h-4 text-success-500" />
                <span>Dados protegidos e seguros</span>
              </li>
            </ul>
            
            {/* Version Badge */}
            <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
              {appVersion}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-text-tertiary text-center sm:text-left">
              © {currentYear} CRM SaaS. Todos os direitos reservados.
            </p>

            {/* Legal Links */}
            <div className="flex items-center gap-4">
              {legalLinks.map((link, index) => (
                <React.Fragment key={link.label}>
                  <Link
                    to={link.href}
                    className="text-xs text-text-tertiary hover:text-primary-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                  {index < legalLinks.length - 1 && (
                    <span className="text-border-default">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
