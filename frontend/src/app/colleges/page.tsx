"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Search, Upload } from 'lucide-react';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

interface College {
  _id: string;
  name: string;
  name_lc: string;
  code: string;
  is_other: boolean;
  sort_order: number;
}

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Bulk upload state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    is_other: false,
    sort_order: 1000
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await api.get('/colleges');
      setColleges(res.data);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError('');
    setBulkSuccessMsg('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Detect header row to skip it
        let startIndex = 0;
        if (data.length > 0 && Array.isArray(data[0])) {
          const headerStr = data[0].join(' ').toLowerCase();
          if (headerStr.includes('name') || headerStr.includes('college') || headerStr.includes('s.no') || headerStr.includes('serial')) {
            startIndex = 1;
          }
        }

        const parsedColleges = [];
        for (let i = startIndex; i < data.length; i++) {
          const row: any = data[i];
          if (row && row.length > 0) {
            // Check if the first column is a serial number
            // We consider it a serial number if it's purely numerical and there's a next column with a string
            const firstCell = String(row[0]).trim();
            const isFirstColNumber = firstCell !== '' && !isNaN(Number(firstCell));
            
            // If the first column is a number and we have at least 2 columns, 
            // assume index 1 is Name and index 2 is Code. Otherwise, index 0 is Name and index 1 is Code.
            const nameIdx = (isFirstColNumber && row.length > 1) ? 1 : 0;
            const codeIdx = nameIdx + 1;

            const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
            const code = row[codeIdx] ? String(row[codeIdx]).trim() : '';

            if (name) {
              parsedColleges.push({ name, code });
            }
          }
        }
        
        if (parsedColleges.length === 0) {
          setBulkError('No valid colleges found in the file. Ensure the first column contains the college names.');
          return;
        }

        setBulkData(parsedColleges);
        setIsBulkModalOpen(true);
      } catch (err) {
        console.error(err);
        setBulkError('Error parsing the file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkSubmit = async () => {
    setBulkLoading(true);
    setBulkError('');
    setBulkSuccessMsg('');
    
    try {
      const res = await api.post('/colleges/bulk', bulkData);
      setBulkSuccessMsg(res.data.message || 'Upload complete');
      await fetchColleges();
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkData([]);
        setBulkSuccessMsg('');
      }, 2000);
    } catch (error: any) {
      setBulkError(error.response?.data?.message || 'Error bulk uploading colleges');
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (college?: College) => {
    setFormError('');
    if (college) {
      setEditingId(college._id);
      setFormData({
        name: college.name,
        code: college.code || '',
        is_other: college.is_other,
        sort_order: college.sort_order
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        is_other: false,
        sort_order: 1000
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingId) {
        await api.put(`/colleges/${editingId}`, formData);
      } else {
        await api.post('/colleges', formData);
      }
      await fetchColleges();
      handleCloseModal();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Error saving college');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this college? This will permanently remove it from the registration form.')) return;
    
    try {
      await api.delete(`/colleges/${id}`);
      await fetchColleges();
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (error) {
      console.error('Error deleting college:', error);
      alert('Error deleting college');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredColleges.map(c => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected colleges?`)) return;
    
    setIsBulkDeleting(true);
    try {
      await api.delete('/colleges/bulk', { data: { ids: selectedIds } });
      await fetchColleges();
      setSelectedIds([]);
    } catch (error) {
      console.error('Error bulk deleting colleges:', error);
      alert('Error bulk deleting colleges');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-6xl"
    >
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Colleges Directory</h2>
          <p className="text-[#86868b] mt-1 font-medium">Manage colleges for the hackathon registration</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Trash2 size={20} />
              {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Upload size={20} />
            Bulk Upload
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#007aff] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Add College
          </button>
        </div>
      </header>

      <div className="glass-card mb-6 p-4 flex items-center gap-3">
        <Search className="text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search colleges by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-gray-700"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredColleges.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#007aff] focus:ring-[#007aff]"
                  />
                </th>
                <th className="py-4 px-6 font-semibold text-gray-600">College Name</th>
                <th className="py-4 px-6 font-semibold text-gray-600">Code</th>
                <th className="py-4 px-6 font-semibold text-gray-600 text-center">Is 'Other' Option</th>
                <th className="py-4 px-6 font-semibold text-gray-600 text-center">Sort Order</th>
                <th className="py-4 px-6 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No colleges found.
                  </td>
                </tr>
              ) : (
                filteredColleges.map((college) => (
                  <tr key={college._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(college._id)}
                        onChange={() => handleSelect(college._id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#007aff] focus:ring-[#007aff]"
                      />
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">{college.name}</td>
                    <td className="py-4 px-6 text-gray-600">{college.code || '-'}</td>
                    <td className="py-4 px-6 text-center">
                      {college.is_other ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center text-gray-600">{college.sort_order}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(college)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(college._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit College' : 'Add New College'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">College Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none transition-all"
                      placeholder="e.g. Indian Institute of Technology, Bombay"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">College Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none transition-all"
                      placeholder="e.g. IITB"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order</label>
                      <input
                        type="number"
                        required
                        value={formData.sort_order}
                        onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_other}
                        onChange={(e) => setFormData({...formData, is_other: e.target.checked})}
                        className="w-5 h-5 rounded border-gray-300 text-[#007aff] focus:ring-[#007aff]"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        Is this the "Other" option?
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 ml-8 mt-1">Check this if this represents the fallback option (e.g., "Other / Not Listed") which reveals a manual text input.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-[#007aff] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {formLoading ? 'Saving...' : 'Save College'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">
                  Bulk Upload Preview
                </h3>
                <button onClick={() => { setIsBulkModalOpen(false); setBulkData([]); }} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {bulkError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                    {bulkError}
                  </div>
                )}
                {bulkSuccessMsg && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                    {bulkSuccessMsg}
                  </div>
                )}
                
                <p className="text-gray-600 mb-4">
                  Found <strong>{bulkData.length}</strong> valid colleges in the uploaded file. 
                  They will be added and sorted alphabetically.
                </p>

                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-4 font-semibold text-gray-600">Name</th>
                        <th className="py-2 px-4 font-semibold text-gray-600">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkData.slice(0, 50).map((c, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2 px-4 text-gray-800">{c.name}</td>
                          <td className="py-2 px-4 text-gray-500">{c.code || '-'}</td>
                        </tr>
                      ))}
                      {bulkData.length > 50 && (
                        <tr>
                          <td colSpan={2} className="py-3 px-4 text-center text-gray-500 italic">
                            ... and {bulkData.length - 50} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsBulkModalOpen(false); setBulkData([]); }}
                    className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkSubmit}
                    disabled={bulkLoading || !!bulkSuccessMsg}
                    className="bg-[#007aff] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {bulkLoading ? 'Uploading...' : 'Confirm Upload'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
