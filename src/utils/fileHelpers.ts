/**
 * Helper to download/open a calibration document
 * Supports both Base64 encoded strings and direct URLs.
 */
export function downloadCalibrationDocument(
  documentData: string,
  productName: string,
  serie: string
) {
  if (!documentData) return;

  // Check if it's a base64 data URI
  if (documentData.startsWith('data:')) {
    try {
      // Extract file extension and mime type from data URI
      const match = documentData.match(/^data:([^;]+);base64,/);
      const mimeType = match ? match[1] : 'application/pdf';
      
      let extension = 'pdf';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }

      const cleanName = productName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${cleanName}_calibracion_${serie}.${extension}`;

      // Create a temporary link and trigger download
      const tempLink = document.createElement('a');
      tempLink.href = documentData;
      tempLink.setAttribute('download', filename);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    } catch (err) {
      console.error('Error triggering local preview/download:', err);
      // Fallback: simple new tab
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${documentData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  } else {
    // If it's a traditional URL
    window.open(documentData, '_blank', 'noopener,noreferrer');
  }
}
