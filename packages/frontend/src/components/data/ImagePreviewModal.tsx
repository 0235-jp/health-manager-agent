import type { ReactElement } from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/date-utils';
import { useTimezone } from '../../contexts/SettingsContext';
import type { HealthImage } from '../../types';

interface ImagePreviewModalProps {
  image: HealthImage | null;
  onClose: () => void;
}

export function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps): ReactElement | null {
  const timezone = useTimezone();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; memo?: string } }) =>
      api.healthImages.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-images'] });
      setIsEditing(false);
    },
  });

  if (!image) return null;

  const fileUrl = api.healthImages.getFileUrl(image.id);
  const isPdf = image.mime_type === 'application/pdf';

  function startEditing(): void {
    if (!image) return;
    setEditTitle(image.title);
    setEditMemo(image.memo || '');
    setIsEditing(true);
  }

  function saveEdit(): void {
    if (!image) return;
    updateMutation.mutate({
      id: image.id,
      data: { title: editTitle, memo: editMemo },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-lg font-semibold"
              />
            ) : (
              <h3 className="text-lg font-semibold truncate">{image.title}</h3>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {formatDateTime(image.recorded_at, timezone)} / {image.original_filename}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={saveEdit}
                  className="text-sm text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700"
                  disabled={updateMutation.isPending}
                >
                  保存
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-sm text-gray-600 px-3 py-1.5 rounded hover:bg-gray-100"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="text-sm text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50"
              >
                編集
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isPdf ? (
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-[70vh]"
            >
              <p className="text-center text-gray-500 py-8">
                PDF を表示できません。
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  ダウンロード
                </a>
              </p>
            </object>
          ) : (
            <div className="flex items-center justify-center">
              <img
                src={fileUrl}
                alt={image.title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </div>

        {/* Memo */}
        <div className="p-4 border-t bg-gray-50">
          {isEditing ? (
            <textarea
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="メモ"
            />
          ) : (
            image.memo && (
              <p className="text-sm text-gray-600">{image.memo}</p>
            )
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span>{(image.file_size / 1024).toFixed(0)} KB</span>
            <span>{image.mime_type}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
