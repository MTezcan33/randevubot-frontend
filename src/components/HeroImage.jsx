import { useTranslation } from 'react-i18next';
import heroTr from '../assets/hero-tr.jpg';
import heroEn from '../assets/hero-en.jpg';
import heroRu from '../assets/hero-ru.jpg';

const HeroImage = ({ className = '' }) => {
  const { i18n } = useTranslation();
  
  const heroImages = {
    tr: heroTr,
    en: heroEn,
    ru: heroRu
  };

  return (
    <img
      src={heroImages[i18n.language] || heroTr}
      alt="Hero"
      loading="eager"
      className={`w-full h-full object-cover ${className}`}
    />
  );
};