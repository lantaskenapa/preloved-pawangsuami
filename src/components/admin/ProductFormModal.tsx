import React, { useState, useEffect } from 'react';
import { Category, Product, ProductCondition, ProductStatus } from '../../types';
import { formatIDR, parseIDRInput, slugify } from '../../lib/formatters';
import { compressImageFile } from '../../lib/imageCompressor';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShoppingBag,
  Loader2,
  Copy,
  Star,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { executeMagicThumbnail } from '../../lib/magicThumbnail';
import { useToast } from '../ui/Toast';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  categories: Category[];
  existingProducts?: Product[];
  onClose: () => void;
  onSave: (productData: Partial<Product> & { name: string; price: number; category: string }) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  categories,
  existingProducts = [],
  onClose,
  onSave,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [originalPriceInput, setOriginalPriceInput] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('Sangat Baik (90-95%)');
  const [description, setDescription] = useState('');
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('published');
  const [images, setImages] = useState<string[]>([]);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicTargetIndex, setMagicTargetIndex] = useState<number | null>(null);
  const [completenessInput, setCompletenessInput] = useState('');
  const [completenessList, setCompletenessList] = useState<string[]>([]);
  const [minusPointInput, setMinusPointInput] = useState('');
  const [minusPointsList, setMinusPointsList] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPriceInput(productToEdit.price.toString());
      setOriginalPriceInput(productToEdit.original_price ? productToEdit.original_price.toString() : '');
      setCategory(productToEdit.category);
      setCondition(productToEdit.condition);
      setDescription(productToEdit.description);
      setShopeeUrl(productToEdit.shopee_url);
      setStatus(productToEdit.status);
      setImages(productToEdit.images || []);
      setCompletenessList(productToEdit.completeness || []);
      setMinusPointsList(productToEdit.minus_points || []);
      setIsFeatured(!!productToEdit.is_featured);
    } else {
      setName('');
      setPriceInput('');
      setOriginalPriceInput('');
      setCategory(categories[0]?.slug || 'games');
      setCondition('Sangat Baik (90-95%)');
      setDescription('');
      setShopeeUrl('https://shopee.co.id');
      setStatus('published');
      setImages([]);
      setCompletenessList(['Unit Original', 'Box Bawaan']);
      setMinusPointsList([]);
      setIsFeatured(false);
    }
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  // Handle local image file upload with client-side compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsCompressing(true);
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setCompressionStatus(`Mengompres ${file.name} (${i + 1}/${fileList.length})...`);
      try {
        const result = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.82,
        });
        setImages((prev) => [...prev, result.dataUrl]);
        successCount++;
      } catch (err: any) {
        showToast(err?.message || `Gagal memproses file ${file.name}`, 'error');
      }
    }

    if (successCount > 0) {
      showToast(`${successCount} foto berhasil dioptimasi & ditambahkan!`, 'success');
    }

    setIsCompressing(false);
    setCompressionStatus(null);
    e.target.value = '';
  };

  const handleMagicThumbnail = async (targetIndex = 0) => {
    if (images.length === 0 || targetIndex >= images.length) {
      showToast('Unggah foto produk terlebih dahulu untuk mengaktifkan Magic Thumbnail', 'error');
      return;
    }

    const targetImage = images[targetIndex];
    setIsMagicLoading(true);
    setMagicTargetIndex(targetIndex);

    try {
      showToast('Sedang memproses Magic Thumbnail dengan Gemini AI...', 'info');

      const result = await executeMagicThumbnail(targetImage);
      if (result.success && result.transparentImageUrl) {
        setImages((prev) => {
          const copy = [...prev];
          copy[targetIndex] = result.transparentImageUrl!;
          return copy;
        });
        showToast('✨ Magic Thumbnail Gemini berhasil! Background foto produk telah diubah menjadi transparan.', 'success');
      } else {
        showToast(result.error || 'Gagal memproses Magic Thumbnail dengan Gemini AI', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses Magic Thumbnail', 'error');
    } finally {
      setIsMagicLoading(false);
      setMagicTargetIndex(null);
    }
  };

  const handleCopyFromTemplate = (templateId: string) => {
    if (!templateId || !existingProducts) return;
    const target = existingProducts.find((p) => p.id === templateId);
    if (!target) return;

    setName(target.name);
    setPriceInput(target.price.toString());
    setOriginalPriceInput(target.original_price ? target.original_price.toString() : '');
    setCategory(target.category);
    setCondition(target.condition);
    setDescription(target.description);
    setShopeeUrl(target.shopee_url);
    setCompletenessList([...(target.completeness || [])]);
    setMinusPointsList([...(target.minus_points || [])]);
    setIsFeatured(!!target.is_featured);
    if (target.images && target.images.length > 0) {
      setImages([...target.images]);
    }
    showToast(`Data produk berhasil disalin dari "${target.name}"!`, 'info');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetThumbnail = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      return copy;
    });
    showToast('Foto berhasil dijadikan Thumbnail Utama!', 'info');
  };

  const handleMoveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[fromIndex];
      copy[fromIndex] = copy[toIndex];
      copy[toIndex] = temp;
      return copy;
    });
  };

  const handleDropImage = (toIndex: number) => {
    if (draggedImageIndex === null || draggedImageIndex === toIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }
    setImages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedImageIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
    showToast(toIndex === 0 ? 'Foto berhasil dijadikan Thumbnail Utama!' : 'Urutan foto diperbarui!', 'info');
  };

  const handleAddCompleteness = () => {
    if (!completenessInput.trim()) return;
    setCompletenessList((prev) => [...prev, completenessInput.trim()]);
    setCompletenessInput('');
  };

  const handleRemoveCompleteness = (idx: number) => {
    setCompletenessList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddMinusPoint = () => {
    if (!minusPointInput.trim()) return;
    setMinusPointsList((prev) => [...prev, minusPointInput.trim()]);
    setMinusPointInput('');
  };

  const handleRemoveMinusPoint = (idx: number) => {
    setMinusPointsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }
    const parsedPrice = parseIDRInput(priceInput);
    if (parsedPrice < 0) {
      showToast('Harga produk tidak valid', 'error');
      return;
    }
    if (!shopeeUrl.trim()) {
      showToast('Link Shopee wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: productToEdit?.id,
        name: name.trim(),
        price: parsedPrice,
        original_price: originalPriceInput ? parseIDRInput(originalPriceInput) : undefined,
        category,
        condition,
        description: description.trim(),
        shopee_url: shopeeUrl.trim(),
        status,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'],
        completeness: completenessList,
        minus_points: minusPointsList,
        is_featured: isFeatured,
      });
      showToast(productToEdit ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      showToast(err?.message || 'Gagal menyimpan produk', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div 
        className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              {productToEdit ? 'Edit Produk Preloved' : 'Tambah Produk Preloved Baru'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Isi data produk, foto, kondisi fisik, dan link Shopee resmi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 overflow-y-auto space-y-6">
          
          {/* Status Alert & Switcher (When Editing Product) */}
          {productToEdit && (
            status === 'sold' ? (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0 animate-pulse"></span>
                  <div>
                    <span className="text-xs font-bold text-red-900 block">Status Produk: TERJUAL (Sold Out)</span>
                    <span className="text-[11px] text-red-700">Barang saat ini ditandai sudah laku di Shopee</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ubah Menjadi Tersedia Kembali</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Status Produk: TERSEDIA (Ready)</span>
                    <span className="text-[11px] text-emerald-700">Barang aktif dan siap dibeli di Shopee</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus('sold')}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tandai Sebagai Terjual</span>
                </button>
              </div>
            )
          )}

          {/* Template Product Selector (Only in Add mode) */}
          {!productToEdit && existingProducts && existingProducts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-neutral-100/90 border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 shrink-0">
                  <Copy className="w-4 h-4 text-neutral-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Copy dari Template Produk
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Gunakan deskripsi, kategori, & kelengkapan produk yang sudah dibuat
                  </span>
                </div>
              </div>

              <select
                defaultValue=""
                onChange={(e) => {
                  handleCopyFromTemplate(e.target.value);
                  e.target.value = '';
                }}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 text-xs font-semibold bg-white text-neutral-800 focus:outline-hidden focus:border-neutral-900 shadow-2xs cursor-pointer"
              >
                <option value="" disabled>-- Pilih Template Produk --</option>
                {existingProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatIDR(p.price)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Nintendo Switch OLED White - Mario Edition"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900"
            />
          </div>

          {/* Row 2: Price & Original Price & Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Harga Preloved (IDR) *
              </label>
              <input
                type="text"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Contoh: 1500000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900 font-mono"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Tampilan: {formatIDR(parseIDRInput(priceInput))}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Harga Baru Toko (IDR)
              </label>
              <input
                type="text"
                value={originalPriceInput}
                onChange={(e) => setOriginalPriceInput(e.target.value)}
                placeholder="Contoh: 2499000 (Opsional)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900 font-mono"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                {originalPriceInput ? formatIDR(parseIDRInput(originalPriceInput)) : 'Tidak ditampilkan jika kosong'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              >
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Kondisi Barang *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ProductCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              >
                <option value="Like New (99%)">Like New (99%)</option>
                <option value="Sangat Baik (90-95%)">Sangat Baik (90-95%)</option>
                <option value="Baik (80-89%)">Baik (80-89%)</option>
                <option value="Minus Pemakaian (Wajar)">Minus Pemakaian (Wajar)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Link Shopee */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Link Produk di Shopee *
            </label>
            <div className="relative">
              <ShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EE4D2D]" />
              <input
                type="url"
                required
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder="https://shopee.co.id/product/..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Tombol "Beli di Shopee" pada produk akan mengarah langsung ke URL ini.
            </span>
          </div>

          {/* Row 4: Photo Management (Upload + URL + Presets) */}
          <div className="border border-neutral-200 rounded-2xl p-4 sm:p-5 bg-neutral-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Foto Produk ({images.length})
                  </label>
                  {isCompressing && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold animate-pulse border border-blue-200">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      {compressionStatus || 'Mengoptimasi foto...'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Foto langsung dikompresi otomatis (max 1200px) agar hemat memori & tersimpan mulus ke database
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Magic Thumbnail Button */}
                <button
                  type="button"
                  disabled={images.length === 0 || isMagicLoading || isCompressing}
                  onClick={() => handleMagicThumbnail(0)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    images.length === 0
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
                      : isMagicLoading && magicTargetIndex === 0
                        ? 'bg-indigo-700 text-white cursor-wait animate-pulse'
                        : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white cursor-pointer active:scale-98 shadow-sm hover:shadow'
                  }`}
                  title={
                    images.length === 0
                      ? 'Unggah foto terlebih dahulu untuk mengaktifkan Magic Thumbnail'
                      : 'Gunakan AI untuk mendiagnosa dan membuat Magic Thumbnail transparan'
                  }
                >
                  {isMagicLoading && magicTargetIndex === 0 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>
                    {isMagicLoading && magicTargetIndex === 0
                      ? 'Mendiagnosa & Memproses...'
                      : 'Magic Thumbnail'}
                  </span>
                </button>

                {/* Upload Input Button */}
                <label className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                  isCompressing
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer active:scale-98'
                }`}>
                  {isCompressing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isCompressing ? 'Mengompres...' : 'Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isCompressing}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Rendered Image Thumbnails Grid with Drag & Drop & Thumbnail selector */}
            {images.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-500 font-medium gap-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                  <span className="flex items-center gap-1.5 text-neutral-700">
                    <GripVertical className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span><strong>Geser / Drag</strong> kartu foto untuk atur urutan. Foto urutan pertama otomatis jadi <strong>Thumbnail Utama</strong>.</span>
                  </span>
                  <span className="shrink-0 font-bold text-neutral-600">{images.length} foto terpilih</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {images.map((img, index) => {
                    const isThumbnail = index === 0;
                    const isDragging = draggedImageIndex === index;
                    const isDragOver = dragOverImageIndex === index;

                    return (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => {
                          setDraggedImageIndex(index);
                          e.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverImageIndex !== index) {
                            setDragOverImageIndex(index);
                          }
                        }}
                        onDragLeave={() => {
                          setDragOverImageIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropImage(index);
                        }}
                        className={`relative group rounded-2xl overflow-hidden aspect-square border-2 bg-white shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none ${
                          isThumbnail
                            ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                            : isDragOver
                              ? 'border-blue-500 scale-105'
                              : 'border-neutral-200 hover:border-neutral-400'
                        } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                      >
                        <div className="w-full h-full bg-neutral-100">
                          <img
                            src={img}
                            alt={`foto ${index + 1}`}
                            className="w-full h-full object-cover object-center pointer-events-none"
                          />
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between pointer-events-none z-10">
                          {isThumbnail ? (
                            <span className="px-2 py-0.5 rounded-lg bg-neutral-950/90 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/20 backdrop-blur-xs">
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>Thumbnail</span>
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-md bg-neutral-900/70 text-white text-[10px] font-bold flex items-center justify-center backdrop-blur-xs">
                              {index + 1}
                            </span>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            className="p-1 rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow-sm pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Bottom Actions: Quick Reorder / Set as Thumbnail / Magic Cutout */}
                        <div className="absolute bottom-1.5 inset-x-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {/* Move Left Button */}
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveImage(index, 'left');
                              }}
                              className="p-1 rounded-md bg-neutral-900/80 hover:bg-neutral-900 text-white text-[10px] shadow-sm backdrop-blur-xs cursor-pointer"
                              title="Pindahkan ke kiri"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}

                          {/* Set as Thumbnail or Magic Cutout */}
                          {!isThumbnail ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetThumbnail(index);
                                }}
                                className="flex-1 py-1 px-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-900 text-white text-[9px] font-bold shadow-sm backdrop-blur-xs flex items-center justify-center gap-1 truncate cursor-pointer active:scale-95"
                                title="Jadikan foto ini Thumbnail Utama"
                              >
                                <Star className="w-2.5 h-2.5 text-amber-400" />
                                <span className="truncate">Sampul</span>
                              </button>
                              <button
                                type="button"
                                disabled={isMagicLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMagicThumbnail(index);
                                }}
                                className="py-1 px-1.5 rounded-md bg-indigo-600/90 hover:bg-indigo-700 text-white text-[9px] font-bold shadow-sm backdrop-blur-xs flex items-center justify-center gap-0.5 cursor-pointer active:scale-95"
                                title="Magic Thumbnail AI"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isMagicLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMagicThumbnail(index);
                              }}
                              className="flex-1 py-1 px-1.5 rounded-md bg-indigo-600/90 hover:bg-indigo-700 text-white text-[9px] font-bold shadow-sm backdrop-blur-xs flex items-center justify-center gap-1 truncate cursor-pointer active:scale-95"
                              title="Magic Thumbnail AI"
                            >
                              {isMagicLoading && magicTargetIndex === index ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                              )}
                              <span className="truncate">Magic Cutout</span>
                            </button>
                          )}

                          {/* Move Right Button */}
                          {index < images.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveImage(index, 'right');
                              }}
                              className="p-1 rounded-md bg-neutral-900/80 hover:bg-neutral-900 text-white text-[10px] shadow-sm backdrop-blur-xs cursor-pointer"
                              title="Pindahkan ke kanan"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-white">
                <ImageIcon className="w-8 h-8 text-neutral-300 mx-auto mb-1" />
                <p className="text-xs text-neutral-500">Belum ada foto yang dipilih. Unggah foto atau tempel URL gambar di atas.</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Deskripsi & Spesifikasi Produk *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kondisi fisik secara detail, fungsi tombol/layar, pemakaian berapa lama, minus jika ada..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-hidden focus:border-neutral-900 leading-relaxed"
            />
          </div>

          {/* Row 7: Kelengkapan Item Checklist */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Kelengkapan Barang
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={completenessInput}
                onChange={(e) => setCompletenessInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCompleteness();
                  }
                }}
                placeholder="Contoh: Box Original, Kabel Charger Bawaan, Nota Pembelian"
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddCompleteness}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
              >
                Tambah
              </button>
            </div>

            {completenessList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {completenessList.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium border border-neutral-200"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompleteness(idx)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row: Poin-Poin Minus Barang */}
          <div>
            <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">
              Poin-Poin Minus Barang
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={minusPointInput}
                onChange={(e) => setMinusPointInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMinusPoint();
                  }
                }}
                placeholder="Contoh: Baret halus di sudut bawah, Dus sedikit penyok"
                className="flex-1 px-3 py-2 rounded-xl border border-red-300 bg-red-50/20 text-xs text-neutral-900 focus:outline-hidden focus:border-red-500"
              />
              <button
                type="button"
                onClick={handleAddMinusPoint}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                Tambah
              </button>
            </div>

            {minusPointsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {minusPointsList.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200"
                  >
                    <span>• {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMinusPoint(idx)}
                      className="text-red-400 hover:text-red-700"
                      title="Hapus poin minus"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isFeaturedToggle"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
            />
            <label htmlFor="isFeaturedToggle" className="text-xs font-medium text-neutral-800 cursor-pointer">
              Tandai sebagai <strong>Koleksi Unggulan</strong> (tampil di etalase terdepan)
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-neutral-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || isCompressing}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || isCompressing}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              {(saving || isCompressing) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {saving
                  ? 'Menyimpan ke Database...'
                  : isCompressing
                    ? 'Sedang Mengompres Foto...'
                    : productToEdit
                      ? 'Simpan Perubahan'
                      : 'Terbitkan Produk'}
              </span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
