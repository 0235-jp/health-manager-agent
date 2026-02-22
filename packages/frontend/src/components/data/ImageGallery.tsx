import type { ReactElement } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/date-utils';
import { useTimezone } from '../../contexts/SettingsContext';
import { ImageUploadForm } from './ImageUploadForm';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { HealthImage } from '../../types';

const PAGE_SIZE = 12;

export function ImageGallery(): ReactElement {
  const timezone = useTimezone();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<HealthImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthImage | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['health-images', page],
    queryFn: () => api.healthImages.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.healthImages.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-images'] });
      setDeleteTarget(null);
    },
  });

  function getThumbnailUrl(image: HealthImage): string {
    if (image.mime_type === 'application/pdf') {
      return '';
    }
    return api.healthImages.getFileUrl(image.id);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラーが発生しました: {(error as Error).message}
      </div>
    );
  }

  const images = data?.data || [];
  const total = data?.pagination.total || 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {total > 0 ? `${total} 件の画像` : ''}
        </span>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 画像を追加
        </button>
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-gray-500">健康診断画像がありません</p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            画像をアップロード
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => {
              const thumbnailUrl = getThumbnailUrl(image);
              const isPdf = image.mime_type === 'application/pdf';

              return (
                <div
                  key={image.id}
                  className="group relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => setPreviewImage(image)}
                    className="w-full aspect-square flex items-center justify-center bg-gray-100 cursor-pointer"
                  >
                    {isPdf ? (
                      <div className="flex flex-col items-center text-gray-400">
                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs mt-1">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={thumbnailUrl}
                        alt={image.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{image.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateTime(image.recorded_at, timezone)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(image); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-1.5 text-red-500 hover:text-red-700 hover:bg-white shadow-sm"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-sm text-gray-500">
                全 {total} 件中 {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} 件
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-100"
                >
                  前へ
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-100"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ImageUploadForm isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">画像の削除</h3>
            <p className="text-gray-600 mb-4">
              「{deleteTarget.title}」を削除してもよろしいですか？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                disabled={deleteMutation.isPending}
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
