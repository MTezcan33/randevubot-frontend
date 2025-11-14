import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, User, Edit, Trash2, MoreVertical, Mail, Phone, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';

// Function to generate a random pleasant color
const getRandomColor = () => {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * (90 - 70 + 1)) + 70; // Saturation between 70% and 90%
  const l = Math.floor(Math.random() * (80 - 70 + 1)) + 70; // Lightness between 70% and 80%
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const StaffPage = () => {
  const { company, staff, refreshCompany } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Uzman',
    color: getRandomColor(),
  });

  useEffect(() => {
    if (editingStaff) {
      setFormData({
        name: editingStaff.name,
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        role: editingStaff.role,
        color: editingStaff.color || getRandomColor(), // Fallback to a random color if null
      });
    } else {
      resetForm();
    }
  }, [editingStaff]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Uzman',
      color: getRandomColor(),
    });
  };

  const handleOpenModal = (staffMember = null) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!company) return;
    setLoading(true);

    try {
      let error;
      if (editingStaff) {
        // Update existing staff
        const { error: updateError } = await supabase
          .from('company_users')
          .update({ ...formData })
          .eq('id', editingStaff.id);
        error = updateError;
      } else {
        // Create new staff
        const { error: createError } = await supabase
          .from('company_users')
          .insert([{ ...formData, company_id: company.id }]);
        error = createError;
      }

      if (error) throw error;

      toast({
        title: "Başarılı! 🎉",
        description: `Uzman ${editingStaff ? 'güncellendi' : 'eklendi'}.`
      });

      await refreshCompany();
      handleCloseModal();
    } catch (error) {
      toast({
        title: "Hata",
        description: error.message || "İşlem başarısız oldu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteAlert = (staffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', staffToDelete.id);

      if (error) throw error;

      toast({
        title: "Başarılı!",
        description: `${staffToDelete.name} adlı uzman silindi.`
      });

      await refreshCompany();
      setIsDeleteAlertOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      toast({
        title: "Hata",
        description: error.message || "Silme işlemi başarısız oldu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('staffTitle')} | RandevuBot</title>
        <meta name="description" content={t('staffSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('staffTitle')}</h1>
            <p className="text-slate-600">{t('staffSubtitle')}</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addStaff')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((staffMember) => (
            <div key={staffMember.id} className="glass-effect p-6 rounded-2xl flex flex-col justify-between" style={{ borderTop: `4px solid ${staffMember.color || '#ccc'}` }}>
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center" style={{ backgroundColor: staffMember.color ? `${staffMember.color}40` : '#e2e8f0' }}>
                      <User className="w-8 h-8" style={{ color: staffMember.color || '#64748b' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{staffMember.name}</h3>
                      <p className="text-sm text-slate-500">{staffMember.role === 'Yönetici' ? t('staffRoleAdmin') : t('staffRoleExpert')}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleOpenModal(staffMember)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteAlert(staffMember)} className="text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {staffMember.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{staffMember.email}</span>
                    </div>
                  )}
                  {staffMember.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{staffMember.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Uzmanı Düzenle' : 'Yeni Uzman Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">İsim Soyisim</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">E-posta</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telefon</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div className='flex items-end gap-4'>
              <div className='flex-grow'>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-lg border bg-white">
                  <option value="Uzman">{t('staffRoleExpert')}</option>
                  <option value="Yönetici">{t('staffRoleAdmin')}</option>
                </select>
              </div>
              <div className='flex flex-col items-center'>
                 <label htmlFor="color-picker" className="block text-sm font-medium mb-2 text-center">Renk</label>
                 <input 
                    id="color-picker" 
                    type="color" 
                    value={formData.color} 
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                    className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" 
                  />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCloseModal}>İptal</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uzmanı Sil</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{staffToDelete?.name}</strong> adlı uzmanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteAlertOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffPage;