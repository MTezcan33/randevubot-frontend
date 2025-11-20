

import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Phone, Mail, FileText, Users, Search, User, Download, Upload, ChevronLeft, ChevronRight, X, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ITEMS_PER_PAGE = 20;

const CustomersPage = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [fileToImport, setFileToImport] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState(null);

  useEffect(() => {
    if (company) {
      fetchCustomers();
    }
  }, [company]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('customerFetchError'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    if (customer) {
      setCustomerData(customer);
    } else {
      setCustomerData({ name: '', phone: '', email: '', notes: '' });
    }
    setIsModalOpen(true);
  };
  
  const handleNameInputChange = (e) => {
    setCustomerData({...customerData, name: e.target.value.toUpperCase()});
  };

  const handleSave = async () => {
    if (!customerData.name) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive" });
      return;
    }
    try {
      let error;
      if (editingCustomer) {
        ({ error } = await supabase.from('customers').update(customerData).eq('id', editingCustomer.id));
      } else {
        ({ error } = await supabase.from('customers').insert([{ ...customerData, company_id: company.id }]));
      }

      if (error) throw error;
      toast({ title: t('success'), description: t('customerSaved') });
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toast({ title: t('error'), description: t('customerSaveError'), variant: "destructive" });
    }
  };

  const handleDeleteClick = (customerId) => {
    setCustomerToDeleteId(customerId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDeleteId) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDeleteId);

      if (error) throw error;
      toast({ title: t('success'), description: t('customerDeleted') });
      fetchCustomers();
    } catch (error) {
      toast({ title: t('error'), description: t('customerDeleteError'), variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setCustomerToDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['İsim', 'Telefon', 'E-posta', 'Notlar', 'Kayıt Tarihi'];
    const csvData = filteredCustomers.map(c => ({
      'İsim': c.name,
      'Telefon': c.phone || '',
      'E-posta': c.email || '',
      'Notlar': c.notes || '',
      'Kayıt Tarihi': new Date(c.created_at).toLocaleDateString()
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(csvData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Müşteriler");
    XLSX.writeFile(workbook, `musteriler_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileToImport(e.target.files[0]);
    }
  };
  
  const handleImport = async () => {
    if (!fileToImport) {
        toast({ title: t('error'), description: t('selectFileToImport'), variant: 'destructive' });
        return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            const newCustomers = json.map(row => ({
                company_id: company.id,
                name: String(row['İsim'] || row['Name'] || '').toUpperCase(),
                phone: String(row['Telefon'] || row['Phone'] || ''),
                email: String(row['E-posta'] || row['Email'] || ''),
                notes: String(row['Notlar'] || row['Notes'] || '')
            })).filter(c => c.name);

            if (newCustomers.length > 0) {
                const { error } = await supabase.from('customers').insert(newCustomers);
                if (error) throw error;
                toast({ title: t('success'), description: `${newCustomers.length} ${t('customersImported')}` });
                fetchCustomers();
                closeImportModal();
            } else {
                toast({ title: t('warning'), description: t('noCustomersFoundInFile'), variant: 'default' });
            }
        } catch (err) {
            toast({ title: t('error'), description: t('fileImportError'), variant: 'destructive' });
        } finally {
            setIsImporting(false);
        }
    };
    reader.readAsArrayBuffer(fileToImport);
  };
  
  const closeImportModal = () => {
      setIsImportModalOpen(false);
      setFileToImport(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <>
      <Helmet>
        <title>{t('customersTitle')} | RandevuBot</title>
        <meta name="description" content={t('customersSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('customersTitle')}
            </h1>
            <p className="text-slate-600">{t('customersSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">{filteredCustomers.length}</span>
            </div>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                {t('import')}
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={filteredCustomers.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {t('export')}
            </Button>
            <Button onClick={() => openModal()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('addCustomer')}
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchCustomers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchQuery ? t('noSearchResults') : t('noCustomer')}
              </h3>
              <p className="text-slate-500">
                {searchQuery ? t('tryDifferentSearch') : t('addFirstCustomer')}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerName')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerPhone')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerEmail')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerNotes')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('registrationDate')}</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentCustomers.map((customer, index) => (
                      <tr key={customer.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">{customer.name?.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{customer.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.phone ? (<a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"><Phone className="w-4 h-4" />{customer.phone}</a>) : (<span className="text-slate-400">-</span>)}
                        </td>
                        <td className="px-6 py-4">
                          {customer.email ? (<a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-slate-700 hover:text-purple-600 transition-colors truncate max-w-xs"><Mail className="w-4 h-4 flex-shrink-0" /><span className="truncate">{customer.email}</span></a>) : (<span className="text-slate-400">-</span>)}
                        </td>
                        <td className="px-6 py-4">
                          {customer.notes ? (<div className="flex items-start gap-2 max-w-xs"><FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /><p className="text-sm text-slate-600 line-clamp-2">{customer.notes}</p></div>) : (<span className="text-slate-400">-</span>)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(customer.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openModal(customer)} className="hover:bg-blue-100 hover:text-blue-700"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(customer.id)} className="hover:bg-red-100 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
                  <div className="text-sm text-slate-600">{t('showing')} {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} {t('of')} {filteredCustomers.length}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                          return (<Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className={currentPage === pageNum ? "bg-gradient-to-r from-blue-600 to-purple-600" : ""}>{pageNum}</Button>);
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className="px-2">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>{editingCustomer ? t('editCustomer') : t('newCustomer')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{t('customerName')} *</label><div className="relative"><User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder={t('customerName')} value={customerData.name} onChange={handleNameInputChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{t('customerPhone')}</label><div className="relative"><Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="tel" placeholder="+90 555 123 4567" value={customerData.phone} onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{t('customerEmail')}</label><div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="email" placeholder="ornek@email.com" value={customerData.email} onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{t('customerNotes')}</label><textarea placeholder={t('customerNotesPlaceholder')} value={customerData.notes} onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImportModalOpen} onOpenChange={closeImportModal}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                    {t('importCustomers')}
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p className="text-sm text-slate-600">{t('importCustomersDesc')}</p>
                <div 
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    {fileToImport ? (
                        <p className="font-semibold text-slate-800">{fileToImport.name}</p>
                    ) : (
                        <p className="text-slate-500">{t('selectOrDragFile')}</p>
                    )}
                </div>
                {fileToImport && (
                    <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg">
                        <span className="text-sm font-medium text-slate-700 truncate">{fileToImport.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setFileToImport(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
                <a href="/Musteri_Iceri_Aktarma_Sablonu.xlsx" download className="text-sm text-blue-600 hover:underline">{t('downloadTemplate')}</a>
            </div>
            <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeImportModal}>{t('cancel')}</Button>
                <Button onClick={handleImport} disabled={!fileToImport || isImporting} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    {isImporting ? t('importing') : t('import')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouAbsolutelySure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCustomerConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomersPage;

