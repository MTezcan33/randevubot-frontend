import React from 'react';

// 1. ADIM: Resmi proje klasöründen çağırıyoruz.
// Bu satır React'e diyor ki: "Bu resmi al, paketle ve yayına hazırla"
// Hem PC'de hem GitHub'da çalışmasının sırrı budur.
import heroResmi from '../assets/hero.PNG'; 

const HeroImage = () => {
  return (
    <div className='flex justify-center items-center'>
      {/* 2. ADIM: Yukarıda import ettiğimiz ismi buraya süslü parantez ile yazıyoruz */}
      <img 
        src={heroResmi} 
        alt='Randevu Yönetiminin Geleceği' 
        className='w-full h-auto object-cover'
      />
    </div>
  );
};

export default HeroImage;