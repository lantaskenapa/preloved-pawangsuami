import React, { useState, useEffect } from 'react';
import { Category, Product, ProductCondition, ProductStatus } from '../../types';
import { formatIDR, parseIDRInput, slugify } from '../../lib/formatters';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (productData: Partial<Product> & { name: string; price: number; category: string }) => Promise<void>;
}

// Preset photo options for quick testing
const PRESET_PHOTOS = [
  { name: 'Nintendo Switch', url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1000&q=80' },
  { name: 'DualSense PS5', url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Headphone Audio', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80' },
  { name: 'iPad / Tablet', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Mechanical Keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Jam Tangan Seiko', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Kaos Graphic Tee', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Flannel Shirt', url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Lego Car', url: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=1000&q=80' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  categories,
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
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [completenessInput, setCompletenessInput] = useState('');
  const [completenessList, setCompletenessList] = useState<string[]>([]);
  const [minusPointInput, setMinusPointInput] = useState('');
  const [minusPointsList, setMinusPointsList] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Handle local image file upload (converts to data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 5MB max check
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File ${file.name} melebihi batas 5MB`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setImages((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl('');
  };

  const handleAddPresetPhoto = (url: string) => {
    if (!images.includes(url)) {
      setImages((prev) => [...prev, url]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
    } catch {
      showToast('Gagal menyimpan produk', 'error');
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
          
          {/* Row 1: Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
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

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Status Publikasi
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-hidden ${
                  status === 'published'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : status === 'sold'
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : status === 'booked'
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-800'
                }`}
              >
                <option value="published">Tersedia (Published - Siap Jual)</option>
                <option value="sold">Terjual (Sold Out - Laku)</option>
                <option value="booked">Dibooking (Booked - Menunggu Bayar)</option>
                <option value="draft">Draf (Draft - Hanya Admin)</option>
              </select>
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Foto Produk ({images.length})
                </label>
                <p className="text-xs text-neutral-500">
                  Unggah file foto langsung, masukkan URL gambar, atau pilih preset cepat
                </p>
              </div>

              {/* Upload Input Button */}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* URL input field */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Atau tempel URL gambar (https://...)"
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 bg-white"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-700"
              >
                Tambah URL
              </button>
            </div>

            {/* Quick Presets Picker */}
            <div>
              <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-2">
                Pilihan Foto Sampel Cepat:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PHOTOS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddPresetPhoto(preset.url)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[11px] text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-neutral-500" />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rendered Image Thumbnails Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden aspect-square border border-neutral-200 bg-white shadow-2xs">
                    <img src={img} alt={`foto ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-neutral-900/80 text-white text-[9px] font-bold">
                        Sampul
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                      title="Hapus foto ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-white">
                <ImageIcon className="w-8 h-8 text-neutral-300 mx-auto mb-1" />
                <p className="text-xs text-neutral-500">Belum ada foto yang dipilih. Unggah foto atau pilih salah satu preset di atas.</p>
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
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div>
              <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                Poin-Poin Minus / Catatan Fisik Barang
              </label>
              <p className="text-[11px] text-amber-800 mb-2">
                Poin minus ini akan langsung terlihat di kartu katalog produk dan detail produk agar pembeli mendapatkan info jujur dan transparan.
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                className="flex-1 px-3 py-2 rounded-xl border border-amber-300 text-xs text-neutral-900 bg-white"
              />
              <button
                type="button"
                onClick={handleAddMinusPoint}
                className="px-3.5 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold"
              >
                Tambah Minus
              </button>
            </div>

            {minusPointsList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {minusPointsList.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-amber-950 text-xs font-medium border border-amber-200 shadow-2xs"
                  >
                    <span>• {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMinusPoint(idx)}
                      className="text-amber-500 hover:text-red-600"
                      title="Hapus poin minus"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-700 italic">
                Belum ada poin minus ditambahkan (Barang akan ditandai mulus tanpa minus).
              </p>
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
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Menyimpan...' : productToEdit ? 'Simpan Perubahan' : 'Terbitkan Produk'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
