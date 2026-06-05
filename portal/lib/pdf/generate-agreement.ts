import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

interface SignatureData {
  signerName: string
  signerEmail: string
  signerIp: string
  signedAt: string
  agreementTitle: string
  agreementVersion: number
  agreementContent: string
}

const MARGIN = 60
const LINE_HEIGHT = 16
const FONT_SIZE = 10
const HEADING_SIZE = 13
const TITLE_SIZE = 18
const PAGE_WIDTH = 595   // A4
const PAGE_HEIGHT = 842  // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

/**
 * Wraps text to fit within a given width, returns array of lines.
 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const probe = current ? `${current} ${word}` : word
    const width = font.widthOfTextAtSize(probe, size)
    if (width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = probe
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Draws wrapped text on a page, auto-adding new pages when needed.
 * Returns the updated y position and current page.
 */
async function drawWrappedText(
  pdfDoc: PDFDocument,
  pages: PDFPage[],
  text: string,
  font: PDFFont,
  size: number,
  color: [number, number, number],
  y: number,
  currentPage: PDFPage,
): Promise<{ y: number; page: PDFPage; pages: PDFPage[] }> {
  const lines = wrapText(text, font, size, CONTENT_WIDTH)
  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      pages.push(newPage)
      currentPage = newPage
      y = PAGE_HEIGHT - MARGIN
    }
    currentPage.drawText(line, {
      x: MARGIN,
      y,
      size,
      font,
      color: rgb(color[0], color[1], color[2]),
    })
    y -= LINE_HEIGHT
  }
  return { y, page: currentPage, pages }
}

export async function generateAgreementPdf(data: SignatureData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const regularFont  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont     = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont   = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const pages: PDFPage[] = []
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  pages.push(page)
  let y = PAGE_HEIGHT - MARGIN

  // ── Title ──────────────────────────────────────────────────────────────────
  page.drawText(data.agreementTitle, {
    x: MARGIN, y,
    size: TITLE_SIZE, font: boldFont, color: rgb(0.05, 0.05, 0.05),
  })
  y -= TITLE_SIZE + 8

  page.drawText(`Version ${data.agreementVersion}`, {
    x: MARGIN, y,
    size: 9, font: italicFont, color: rgb(0.45, 0.45, 0.45),
  })
  y -= 28

  // ── Divider ────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y },
    end:   { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 20

  // ── Agreement content (strip markdown syntax, render as clean text) ─────
  const contentLines = data.agreementContent.split('\n')
  for (const raw of contentLines) {
    const line = raw.trimEnd()

    if (!line) {
      y -= LINE_HEIGHT * 0.5
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      const text = line.replace(/^### /, '')
      const result = await drawWrappedText(pdfDoc, pages, text, boldFont, FONT_SIZE + 1, [0.1, 0.1, 0.1], y - 4, page)
      y = result.y - 2; page = result.page
      continue
    }
    if (line.startsWith('## ')) {
      const text = line.replace(/^## /, '')
      const result = await drawWrappedText(pdfDoc, pages, text, boldFont, HEADING_SIZE, [0.05, 0.05, 0.05], y - 6, page)
      y = result.y - 4; page = result.page
      continue
    }
    if (line.startsWith('# ')) {
      const text = line.replace(/^# /, '')
      const result = await drawWrappedText(pdfDoc, pages, text, boldFont, HEADING_SIZE + 2, [0.05, 0.05, 0.05], y - 6, page)
      y = result.y - 4; page = result.page
      continue
    }

    // Strip remaining markdown inline (bold, italic, links)
    const clean = line
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/^[-*] /, '• ')

    const result = await drawWrappedText(pdfDoc, pages, clean, regularFont, FONT_SIZE, [0.15, 0.15, 0.15], y, page)
    y = result.y; page = result.page
  }

  // ── Signature page ─────────────────────────────────────────────────────────
  // Always start signature on a new page
  const sigPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  pages.push(sigPage)
  let sy = PAGE_HEIGHT - MARGIN

  sigPage.drawText('SIGNATURE', {
    x: MARGIN, y: sy,
    size: HEADING_SIZE, font: boldFont, color: rgb(0.05, 0.05, 0.05),
  })
  sy -= HEADING_SIZE + 14

  sigPage.drawLine({
    start: { x: MARGIN, y: sy },
    end:   { x: PAGE_WIDTH - MARGIN, y: sy },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  sy -= 24

  // Signature block
  const fields: [string, string][] = [
    ['Signed by',   data.signerName],
    ['Email',       data.signerEmail],
    ['Date & time', new Date(data.signedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })],
    ['IP address',  data.signerIp],
    ['Document',    `${data.agreementTitle} v${data.agreementVersion}`],
  ]

  for (const [label, value] of fields) {
    sigPage.drawText(`${label}:`, {
      x: MARGIN, y: sy,
      size: FONT_SIZE, font: boldFont, color: rgb(0.3, 0.3, 0.3),
    })
    sigPage.drawText(value, {
      x: MARGIN + 100, y: sy,
      size: FONT_SIZE, font: regularFont, color: rgb(0.1, 0.1, 0.1),
    })
    sy -= LINE_HEIGHT + 4
  }

  sy -= 24

  // Signature line graphic
  sigPage.drawLine({
    start: { x: MARGIN, y: sy },
    end:   { x: MARGIN + 200, y: sy },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  })
  sigPage.drawText(data.signerName, {
    x: MARGIN, y: sy - 14,
    size: 9, font: italicFont, color: rgb(0.4, 0.4, 0.4),
  })
  sigPage.drawText('Electronic Signature', {
    x: MARGIN, y: sy - 26,
    size: 8, font: regularFont, color: rgb(0.6, 0.6, 0.6),
  })

  sy -= 60

  // Legal note
  const note =
    'This document was signed electronically. The signature above constitutes a legally binding ' +
    'electronic signature under the Electronic Communications Act 2000 (UK) and the Electronic ' +
    'Signatures Regulations 2002. The signed document and audit record are held securely by ' +
    'Franchise Foundry.'

  const noteLines = wrapText(note, italicFont, 8, CONTENT_WIDTH)
  for (const l of noteLines) {
    sigPage.drawText(l, {
      x: MARGIN, y: sy,
      size: 8, font: italicFont, color: rgb(0.55, 0.55, 0.55),
    })
    sy -= 13
  }

  // ── Page numbers ───────────────────────────────────────────────────────────
  const total = pdfDoc.getPageCount()
  for (let i = 0; i < total; i++) {
    pdfDoc.getPage(i).drawText(`Page ${i + 1} of ${total}`, {
      x: PAGE_WIDTH / 2 - 25,
      y: 30,
      size: 8,
      font: regularFont,
      color: rgb(0.6, 0.6, 0.6),
    })
  }

  return pdfDoc.save()
}
