/**
 * PDF to images conversion utility
 * Converts PDF pages to PNG buffers on-demand (no disk storage)
 */

export interface PdfPageImage {
  page: number;
  buffer: Buffer;
  mime_type: 'image/png';
}

/**
 * Convert a PDF file to an array of PNG buffers (one per page)
 */
export async function pdfToImages(filePath: string): Promise<PdfPageImage[]> {
  const { pdf } = await import('pdf-to-img');

  const pages: PdfPageImage[] = [];
  let pageNum = 1;

  const document = await pdf(filePath, { scale: 2.0 });
  for await (const image of document) {
    pages.push({
      page: pageNum,
      buffer: Buffer.from(image),
      mime_type: 'image/png',
    });
    pageNum++;
  }

  return pages;
}
