import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Globe
} from 'lucide-react';
import timezones from '@/lib/timezones.json';
import countries from '@/lib/countries.json';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [companyData, setCompanyData] = useState({
    address: '',
    country: 'Türkiye',
    timezone: '(GMT+03:00) Istanbul'
  });

  const [staff, setStaff] = useState([
    { name: '', email: '', phone: '', role: 'Uzman', temp_id: 'staff_0' }
  ]);

  const [services, setServices] = useState([
    { expert_id: '', description: '', duration: 30, price: 0 }
  ]);

  const [workingHours, setWorkingHours] = useState([
    { day: 'Pazartesi', is_open: true, start_time: '09:00', end_time: '18:00' },
    { day: 'Salı', is_open: true, start_time: '09:00', end_time: '18:00' },
    { day: 'Çarşamba', is_open: true, start_time: '09:00', end_time: '18:00' },
    { day: 'Perşembe', is_open: true, start_time: '09:00', end_time: '18:00' },
    { day: 'Cuma', is_open: true, start_time: '09:00', end_time: '18:00' },
    { day: 'Cumartesi', is_open: false, start_time: '09:00', end_time: '18:00' },
    { day: 'Pazar', is_open: false, start_time: '09:00', end_time: '18:00' }
  ]);
  
  const roles = ['Yönetici', 'Uzman'];

  const addStaff = () => {
    setStaff([...staff, { name: '', email: '', phone: '', role: 'Uzman', temp_id: `staff_${staff.length}` }]);
  };

  const removeStaff = (index) => {
    const newStaff = staff.filter((_, i) => i !== index);
    setStaff(newStaff);
  };

  const addService = () => {
    setServices([...services, { expert_id: '', description: '', duration: 30, price: 0 }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!company) {
      toast({ title: "Hata", description: "Firma bilgisi bulunamadı. Lütfen tekrar giriş yapın.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const staffToInsert = staff.map(s => ({
        company_id: company.id,
        name: s.name.toUpperCase(),
        email: s.email,
        phone: s.phone,
        role: s.role
      }));

      const { data: insertedStaff, error: staffError } = await supabase
        .from('company_users')
        .insert(staffToInsert)
        .select();

      if (staffError) {
        if(staffError.message.includes('company_users_email_key')) {
          throw new Error("Personel listesindeki bir e-posta adresi zaten kullanılıyor. Lütfen kontrol edin.");
        }
        throw staffError;
      }
      
      const tempIdToRealIdMap = {};
      staff.forEach((tempStaff) => {
        const found = insertedStaff.find(realStaff => realStaff.email === tempStaff.email && realStaff.name === tempStaff.name.toUpperCase());
        if (found) {
            tempIdToRealIdMap[tempStaff.temp_id] = found.id;
        }
      });
      
      const servicesToInsert = services
        .filter(s => s.description && s.duration > 0)
        .map(s => ({
          company_id: company.id,
          expert_id: tempIdToRealIdMap[s.expert_id] || null,
          description: s.description,
          duration: s.duration,
          price: s.price
        }));

      if (servicesToInsert.length > 0) {
        const { error: servicesError } = await supabase
          .from('company_services')
          .insert(servicesToInsert);
        if (servicesError) throw servicesError;
      }

      const workingHoursToInsert = [];
      insertedStaff.forEach(expert => {
        if (expert.role === 'Uzman') {
          workingHours.forEach(day => {
            workingHoursToInsert.push({
              company_id: company.id,
              expert_id: expert.id,
              day: day.day,
              is_open: day.is_open,
              start_time: day.is_open ? day.start_time : null,
              end_time: day.is_open ? day.end_time : null,
            });
          });
        }
      });
      
      if (workingHoursToInsert.length > 0) {
        const { error: hoursError } = await supabase
          .from('company_working_hours')
          .insert(workingHoursToInsert);
        if (hoursError) throw hoursError;
      }

      const { error: companyError } = await supabase
        .from('companies')
        .update({
          address: companyData.address,
          country: companyData.country,
          timezone: companyData.timezone,
          onboarding_completed: true
        })
        .eq('id', company.id);
        
      if (companyError) throw companyError;

      await refreshCompany();

      toast({
        title: "Kurulum tamamlandı! 🎉",
        description: "Dashboard'a yönlendiriliyorsunuz..."
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Hata",
        description: error.message || "Kurulum sırasında bir hata oluştu. Lütfen bilgileri kontrol edip tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Kurulum Sihirbazı | RandevuBot</title>
        <meta name="description" content="Firmanızı kurun ve kullanmaya başlayın" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect rounded-3xl p-8"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Kurulum Sihirbazı</h1>
              <p className="text-slate-600">Adım {step} / 4</p>
              <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold flex items-center">
                  <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                  Adres Bilgileri
                </h2>

                <div>
                  <label className="block text-sm font-medium mb-2">Adres</label>
                  <textarea
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Firma adresiniz"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center"><Globe className="w-4 h-4 mr-2" />Ülke</label>
                    <select
                      value={companyData.country}
                      onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {countries.map(country => (
                        <option key={country.code} value={country.name}>{country.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center"><Clock className="w-4 h-4 mr-2" />Zaman Dilimi</label>
                    <select
                      value={companyData.timezone}
                      onChange={(e) => setCompanyData({ ...companyData, timezone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {timezones.map(tz => (
                        <option key={tz.text} value={tz.text}>{tz.text}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold flex items-center">
                    <Users className="w-6 h-6 mr-2 text-blue-600" />
                    Personeller
                  </h2>
                  <Button onClick={addStaff} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Personel Ekle
                  </Button>
                </div>

                {staff.map((person, index) => (
                  <div key={person.temp_id} className="glass-effect p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Personel {index + 1}</h3>
                      {staff.length > 0 && (
                        <button onClick={() => removeStaff(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Ad Soyad"
                        value={person.name}
                        onChange={(e) => {
                          const newStaff = [...staff];
                          newStaff[index].name = e.target.value;
                          setStaff(newStaff);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        placeholder="E-posta"
                        value={person.email}
                        onChange={(e) => {
                          const newStaff = [...staff];
                          newStaff[index].email = e.target.value;
                          setStaff(newStaff);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="tel"
                        placeholder="Telefon"
                        value={person.phone}
                        onChange={(e) => {
                          const newStaff = [...staff];
                          newStaff[index].phone = e.target.value;
                          setStaff(newStaff);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={person.role}
                        onChange={(e) => {
                          const newStaff = [...staff];
                          newStaff[index].role = e.target.value;
                          setStaff(newStaff);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold flex items-center">
                    <Briefcase className="w-6 h-6 mr-2 text-blue-600" />
                    Hizmetler
                  </h2>
                  <Button onClick={addService} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Hizmet Ekle
                  </Button>
                </div>

                {services.map((service, index) => (
                  <div key={index} className="glass-effect p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Hizmet {index + 1}</h3>
                      {services.length > 1 && (
                        <button onClick={() => removeService(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                      <select
                        value={service.expert_id}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].expert_id = e.target.value;
                          setServices(newServices);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Uzman Seçin</option>
                        {staff.filter(s => s.role === 'Uzman').map(expert => (
                          <option key={expert.temp_id} value={expert.temp_id}>{expert.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Hizmet Açıklaması"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].description = e.target.value;
                          setServices(newServices);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Süre (dk)"
                        value={service.duration}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].duration = parseInt(e.target.value) || 0;
                          setServices(newServices);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Fiyat (TL)"
                        value={service.price}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].price = parseFloat(e.target.value) || 0;
                          setServices(newServices);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-blue-600" />
                  Genel Çalışma Saatleri
                </h2>
                <p className="text-slate-500 text-sm">Bu saatler, oluşturacağınız tüm uzmanlar için varsayılan olarak ayarlanacaktır. Daha sonra her uzman için ayrı ayrı düzenleyebilirsiniz.</p>

                {workingHours.map((day, index) => (
                  <div key={index} className="glass-effect p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold">{day.day}</span>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={day.is_open}
                          onChange={(e) => {
                            const newHours = [...workingHours];
                            newHours[index].is_open = e.target.checked;
                            setWorkingHours(newHours);
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Açık</span>
                      </label>
                    </div>

                    {day.is_open && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">Başlangıç</label>
                          <input
                            type="time"
                            value={day.start_time}
                            onChange={(e) => {
                              const newHours = [...workingHours];
                              newHours[index].start_time = e.target.value;
                              setWorkingHours(newHours);
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Bitiş</label>
                          <input
                            type="time"
                            value={day.end_time}
                            onChange={(e) => {
                              const newHours = [...workingHours];
                              newHours[index].end_time = e.target.value;
                              setWorkingHours(newHours);
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>

              {step < 4 ? (
                <Button onClick={() => setStep(step + 1)}>
                  İleri
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default OnboardingPage;