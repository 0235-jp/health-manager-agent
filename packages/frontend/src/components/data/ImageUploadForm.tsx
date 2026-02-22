import type { ReactElement } from 'react';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ImageUploadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.pdf';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploadForm({ isOpen, onClose }: ImageUploadFormProps): ReactElement | null {
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: () =>
      api.healthImages.upload({
        title,
        memo: memo || undefined,
        recorded_at: new Date(recordedAt).toISOString(),
        files,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-images'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function resetForm(): void {
    setTitle('');
    setMemo('');
    setRecordedAt(new Date().toISOString().slice(0, 16));
    setFiles([]);
    setError('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selectedFiles = Array.from(e.target.files || []);
    const invalid = selectedFiles.find((f) => f.size > MAX_FILE_SIZE);
    if (invalid) {
      setError(`ファイルサイズが大きすぎます: ${invalid.name} (上限: 10MB)`);
      return;
    }
    if (selectedFiles.length > 5) {
      setError('一度にアップロードできるファイルは5つまでです');
      return;
    }
    setError('');
    setFiles(selectedFiles);
  }

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (files.length === 0) {
      setError('ファイルを選択してください');
      return;
    }
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    uploadMutation.mutate();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">画像アップロード</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="例: 2025年度 健康診断結果"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={2}
                placeholder="補足情報があれば入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                記録日時
              </label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ファイル <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                対応形式: JPEG, PNG, WebP, PDF / 上限: 10MB, 5ファイルまで
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-gray-500 text-xs">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { resetForm(); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                disabled={uploadMutation.isPending}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'アップロード中...' : 'アップロード'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
