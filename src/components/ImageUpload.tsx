import React, { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Camera, Upload, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  storagePath: string;
  label?: string;
  previewClassName?: string;
}

export const ImageUpload: React.FC<Props> = ({ value, onChange, storagePath, label = 'Upload Image', previewClassName = 'w-full h-48 object-cover rounded-[1.5rem]' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError(null);
    const storageRef = ref(storage, `${storagePath}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      snapshot => {
        setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      err => {
        console.error('Upload failed:', err);
        setError('Upload failed. Please try again.');
        setProgress(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setProgress(null);
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {value && progress === null && (
        <div className="relative group">
          <img src={value} alt="Preview" className={previewClassName} />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {progress !== null && (
        <div className="space-y-2">
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className="bg-brand h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">{progress}% uploaded</p>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-brand-light rounded-[1.5rem] p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-brand/40 transition-colors bg-[#F2F1EA]/30"
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
          {value ? <Camera size={20} /> : <Upload size={20} />}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</p>
          <p className="text-[9px] text-stone-400 mt-1">Drop an image or click to browse</p>
        </div>
      </div>

      {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
