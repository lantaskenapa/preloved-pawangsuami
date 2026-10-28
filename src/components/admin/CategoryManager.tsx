import React, { useState } from 'react';
import { Category, Product } from '../../types';
import { getCategoryIcon } from '../../lib/icons';
import { slugify } from '../../lib/formatters';
import { Plus, Edit2, Trash2, Tag, Check, X, Layers } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface CategoryManagerProps {
  categories: Category[];
  products: Product[];
  onSaveCategory: (cat: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategoryRequest: (cat: Category) => void;
}

const AVAILABLE_ICONS = [
  'Gamepad2',
  'Shirt',
  'Tv',
  'Watch',
  'Smartphone',
  'Package',
  'Headphones',
  'Camera',
  'Sparkles',
  'Tag',
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  products,
  onSaveCategory,
  onDeleteCategoryRequest,
}) => {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [description, setDescription] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Compute products per category
  const productCountPerCategory = (catSlug: string) => {
    return products.filter((p) => p.category === catSlug).length;
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setIcon(cat.icon || 'Tag');
    setDescription(cat.description || '');
    setIsAddingNew(false);
  };

  const handleStartNew = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setIcon('Tag');
    setDescription('');
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama kategori wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSaveCategory({
        id: editingId || undefined,
        name: name.trim(),
        slug: slug.trim() || slugify(name.trim()),
        icon,
        description: description.trim(),
      });
      showToast(editingId ? 'Kategori berhasil diperbarui!' : 'Kategori baru berhasil ditambahkan!', 'success');
      handleCancel();
    } catch {
      showToast('Gagal menyimpan kategori', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-neutral-900">
            Daftar Kategori Produk
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Kelola pengelompokan koleksi barang preloved suami
          </p>
        </div>

        {!isAddingNew && !editingId && (
          <button
            onClick={handleStartNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        )}
      </div>

      {/* Inline Form (Add or Edit) */}
      {(isAddingNew || editingId) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border-2 border-neutral-900 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h4 className="text-sm font-bold text-neutral-900">
              {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </h4>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Nama Kategori *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
                placeholder="Contoh: Games"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="games"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Ikon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
              >
                {AVAILABLE_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Deskripsi Singkat Kategori
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Konsol retro, game fisik & aksesoris gaming"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      )}

      {/* Category Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const count = productCountPerCategory(cat.slug);

          return (
            <div
              key={cat.id || cat.slug}
              className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
                      {getCategoryIcon(cat.icon || cat.slug, 'w-4 h-4')}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{cat.name}</h4>
                      <span className="text-[10px] text-neutral-400 font-mono">/{cat.slug}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                    {count} produk
                  </span>
                </div>

                {cat.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => handleStartEdit(cat)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  title="Edit Kategori"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCategoryRequest(cat)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Hapus Kategori"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
