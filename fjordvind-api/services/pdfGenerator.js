/**
 * PDF Generator Service for FjordVind FjordVind
 *
 * Generates professional PDF reports for:
 * - Mattilsynet weekly lice reports
 * - Treatment reports
 * - Environment reports
 * - Custom data exports
 */

const PDFDocument = require('pdfkit');
const pool = require('../config/database');
const logger = require('../utils/logger');

// Color palette
const COLORS = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  danger: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb'
};

// Norwegian week number calculation
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Format date in Norwegian
function formatDate(date) {
  return new Date(date).toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format date short
function formatDateShort(date) {
  return new Date(date).toLocaleDateString('nb-NO');
}

/**
 * Generate a Mattilsynet-compliant lice report
 */
async function generateMattilsynetReport(options) {
  const opts = options || {};
  const {
    locationId,
    startDate,
    endDate,
    companyName = 'FjordVind AS',
    locationName = 'Alle lokaliteter'
  } = opts;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Mattilsynet Ukerapport - Lakselus',
      Author: 'FjordVind FjordVind',
      Creator: 'FjordVind AS'
    }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Fetch lice data
  let samples = [];
  try {
    const query = `
      SELECT
        s.*,
        m.name as merd_name,
        l.name as locality_name
      FROM samples s
      LEFT JOIN merds m ON s.merd_id = m.id
      LEFT JOIN locations l ON m.location_id = l.id
      WHERE 1=1
        ${locationId ? `AND l.id = $1` : ''}
        ${startDate ? `AND s.counted_at >= $${locationId ? 2 : 1}` : ''}
        ${endDate ? `AND s.counted_at <= $${locationId ? 3 : startDate ? 2 : 1}` : ''}
      ORDER BY s.counted_at DESC
    `;

    const params = [];
    if (locationId) params.push(locationId);
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);
    samples = result.rows;
  } catch (err) {
    logger.error('Failed to fetch samples for PDF', { error: err.message });
  }

  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();

  // Calculate statistics
  const avgAdultFemale = samples.length > 0
    ? samples.reduce((sum, s) => sum + (parseFloat(s.adult_female_lice) || 0), 0) / samples.length
    : 0;
  const avgMobile = samples.length > 0
    ? samples.reduce((sum, s) => sum + (parseFloat(s.mobile_lice) || 0), 0) / samples.length
    : 0;
  const avgStationary = samples.length > 0
    ? samples.reduce((sum, s) => sum + (parseFloat(s.stationary_lice) || 0), 0) / samples.length
    : 0;

  // Determine status
  const isSpring = now.getMonth() >= 2 && now.getMonth() <= 5; // March-June
  const limit = isSpring ? 0.2 : 0.5;
  const status = avgAdultFemale >= limit ? 'OVER GRENSE' :
                 avgAdultFemale >= limit * 0.8 ? 'ADVARSEL' : 'OK';

  // ========== HEADER ==========
  doc.fontSize(18)
     .fillColor(COLORS.primary)
     .text('UKERAPPORT - LAKSELUS', { align: 'center' });

  doc.fontSize(12)
     .fillColor(COLORS.text)
     .text('Rapportering til Mattilsynet iht. forskrift om lakselusbekjempelse', { align: 'center' });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
  doc.moveDown();

  // ========== META INFO ==========
  doc.fontSize(10).fillColor(COLORS.text);

  const leftCol = 50;
  const rightCol = 350;
  const metaY = doc.y;

  doc.text(`Lokalitet: ${locationName}`, leftCol, metaY);
  doc.text(`Uke: ${weekNumber}/${year}`, rightCol, metaY);
  doc.text(`Organisasjon: ${companyName}`, leftCol, metaY + 15);
  doc.text(`Generert: ${formatDate(now)}`, rightCol, metaY + 15);

  doc.y = metaY + 40;

  // ========== SUMMARY BOX ==========
  const summaryY = doc.y;
  const summaryHeight = 100;

  doc.rect(50, summaryY, 495, summaryHeight)
     .fillColor(COLORS.background)
     .fill();

  doc.rect(50, summaryY, 495, summaryHeight)
     .strokeColor(COLORS.border)
     .lineWidth(1)
     .stroke();

  doc.fontSize(12)
     .fillColor(COLORS.text)
     .text('OPPSUMMERING LUSETELLING', 60, summaryY + 10, { underline: true });

  // Three columns for stats
  const col1 = 100;
  const col2 = 270;
  const col3 = 440;
  const statsY = summaryY + 40;

  // Adult female lice
  doc.fontSize(24)
     .fillColor(avgAdultFemale >= limit ? COLORS.danger : avgAdultFemale >= limit * 0.8 ? COLORS.warning : COLORS.success)
     .text(avgAdultFemale.toFixed(2), col1, statsY, { width: 100, align: 'center' });
  doc.fontSize(9)
     .fillColor(COLORS.muted)
     .text('Voksne hunnlus (snitt)', col1 - 30, statsY + 30, { width: 160, align: 'center' });
  doc.fontSize(8)
     .text(`Grense: ${limit} ${isSpring ? '(vårperiode)' : ''}`, col1 - 30, statsY + 45, { width: 160, align: 'center' });

  // Mobile lice
  doc.fontSize(24)
     .fillColor(COLORS.text)
     .text(avgMobile.toFixed(2), col2, statsY, { width: 100, align: 'center' });
  doc.fontSize(9)
     .fillColor(COLORS.muted)
     .text('Bevegelige lus (snitt)', col2 - 30, statsY + 30, { width: 160, align: 'center' });

  // Stationary lice
  doc.fontSize(24)
     .fillColor(COLORS.text)
     .text(avgStationary.toFixed(2), col3, statsY, { width: 100, align: 'center' });
  doc.fontSize(9)
     .fillColor(COLORS.muted)
     .text('Fastsittende lus (snitt)', col3 - 30, statsY + 30, { width: 160, align: 'center' });

  doc.y = summaryY + summaryHeight + 20;

  // ========== DATA TABLE ==========
  doc.fontSize(12)
     .fillColor(COLORS.text)
     .text('DETALJERTE TELLINGER', 50, doc.y, { underline: true });
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const tableLeft = 50;
  const colWidths = [80, 80, 70, 80, 80, 80, 70];
  const headers = ['Dato', 'Merd', 'Antall', 'Voksne ♀', 'Bevegelige', 'Fastsittende', 'Status'];

  doc.fontSize(9).fillColor(COLORS.muted);
  let xPos = tableLeft;
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
    xPos += colWidths[i];
  });

  doc.moveTo(tableLeft, tableTop + 15).lineTo(545, tableTop + 15).strokeColor(COLORS.border).stroke();

  // Table rows
  let rowY = tableTop + 20;
  doc.fontSize(9).fillColor(COLORS.text);

  const displaySamples = samples.slice(0, 20); // Max 20 rows per page

  displaySamples.forEach(sample => {
    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
    }

    const adultFemale = parseFloat(sample.adult_female_lice) || 0;
    const rowStatus = adultFemale >= limit ? 'OVER' : adultFemale >= limit * 0.8 ? 'ADVARSEL' : 'OK';

    xPos = tableLeft;
    doc.fillColor(COLORS.text);
    doc.text(formatDateShort(sample.counted_at), xPos, rowY, { width: colWidths[0] });
    xPos += colWidths[0];
    doc.text(sample.merd_name || sample.merd_id || '-', xPos, rowY, { width: colWidths[1] });
    xPos += colWidths[1];
    doc.text(String(sample.fish_count || '-'), xPos, rowY, { width: colWidths[2] });
    xPos += colWidths[2];

    doc.fillColor(adultFemale >= limit ? COLORS.danger : COLORS.text);
    doc.text(adultFemale.toFixed(2), xPos, rowY, { width: colWidths[3] });
    xPos += colWidths[3];

    doc.fillColor(COLORS.text);
    doc.text((parseFloat(sample.mobile_lice) || 0).toFixed(2), xPos, rowY, { width: colWidths[4] });
    xPos += colWidths[4];
    doc.text((parseFloat(sample.stationary_lice) || 0).toFixed(2), xPos, rowY, { width: colWidths[5] });
    xPos += colWidths[5];

    doc.fillColor(rowStatus === 'OVER' ? COLORS.danger : rowStatus === 'ADVARSEL' ? COLORS.warning : COLORS.success);
    doc.text(rowStatus, xPos, rowY, { width: colWidths[6] });

    rowY += 18;
  });

  if (samples.length === 0) {
    doc.fillColor(COLORS.muted)
       .text('Ingen tellinger registrert i denne perioden', tableLeft, rowY, { align: 'center', width: 495 });
  }

  // ========== SIGNATURE SECTION ==========
  doc.y = Math.max(doc.y, rowY + 40);

  if (doc.y > 680) {
    doc.addPage();
  }

  doc.y = 720;

  doc.fontSize(10).fillColor(COLORS.text);
  doc.text('____________________', 70, doc.y);
  doc.text('____________________', 350, doc.y);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor(COLORS.muted);
  doc.text('Driftsleder', 110, doc.y);
  doc.text('Dato', 405, doc.y);

  // ========== FOOTER ==========
  doc.fontSize(8)
     .fillColor(COLORS.muted);

  doc.y = 770;
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(0.5);

  doc.text(
    'Denne rapporten er generert av FjordVind FjordVind og oppfyller kravene i forskrift om lakselusbekjempelse (FOR-2012-12-05-1140).',
    50, doc.y, { width: 495, align: 'center' }
  );
  doc.moveDown(0.3);
  doc.text(
    `Rapport-ID: MT-${Date.now()} | support@fjordvind.no`,
    50, doc.y, { width: 495, align: 'center' }
  );

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Generate a treatment report
 */
async function generateTreatmentReport(options) {
  const opts = options || {};
  const { locationId, startDate, endDate, companyName = 'FjordVind AS' } = opts;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Behandlingsrapport',
      Author: 'FjordVind FjordVind'
    }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Fetch treatment data
  let treatments = [];
  try {
    const result = await pool.query(`
      SELECT t.*, l.name as locality_name, m.name as merd_name
      FROM treatments t
      LEFT JOIN merds m ON t.merd_id = m.id
      LEFT JOIN locations l ON m.location_id = l.id
      WHERE 1=1
        ${locationId ? `AND l.id = $1` : ''}
      ORDER BY t.treatment_date DESC
      LIMIT 50
    `, locationId ? [locationId] : []);
    treatments = result.rows;
  } catch (err) {
    logger.error('Failed to fetch treatments for PDF', { error: err.message });
  }

  // Header
  doc.fontSize(18)
     .fillColor(COLORS.primary)
     .text('BEHANDLINGSRAPPORT', { align: 'center' });

  doc.fontSize(12)
     .fillColor(COLORS.text)
     .text('FjordVind FjordVind', { align: 'center' });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Organisasjon: ${companyName}`);
  doc.text(`Generert: ${formatDate(new Date())}`);
  doc.text(`Antall behandlinger: ${treatments.length}`);
  doc.moveDown();

  // Summary by method
  const methodCounts = {};
  treatments.forEach(t => {
    const method = t.method || 'Ukjent';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  doc.fontSize(12)
     .fillColor(COLORS.text)
     .text('Behandlinger per metode:', { underline: true });
  doc.moveDown(0.5);

  Object.entries(methodCounts).forEach(([method, count]) => {
    doc.fontSize(10).text(`• ${method}: ${count} behandlinger`);
  });

  doc.moveDown();

  // Treatment list
  doc.fontSize(12).text('Behandlingshistorikk:', { underline: true });
  doc.moveDown(0.5);

  let y = doc.y;
  treatments.slice(0, 30).forEach(t => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(10)
       .fillColor(COLORS.text)
       .text(`${formatDateShort(t.treatment_date)} - ${t.locality_name || 'Ukjent'} (${t.merd_name || 'Alle merder'})`, 50, y);
    doc.fontSize(9)
       .fillColor(COLORS.muted)
       .text(`Metode: ${t.method || 'Ikke angitt'} | Effekt: ${t.effectiveness_percent ? t.effectiveness_percent + '%' : 'Ikke målt'}`, 50, y + 12);

    y += 30;
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Generate a simple lice summary report
 */
async function generateLiceSummaryReport(options) {
  const opts = options || {};
  const { locationId, startDate, endDate } = opts;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Luserapport',
      Author: 'FjordVind FjordVind'
    }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Fetch data
  let samples = [];
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as merd_name, l.name as locality_name
      FROM samples s
      LEFT JOIN merds m ON s.merd_id = m.id
      LEFT JOIN locations l ON m.location_id = l.id
      ORDER BY s.counted_at DESC
      LIMIT 100
    `);
    samples = result.rows;
  } catch (err) {
    logger.error('Failed to fetch samples for PDF', { error: err.message });
  }

  // Header
  doc.fontSize(18)
     .fillColor(COLORS.primary)
     .text('LUSERAPPORT', { align: 'center' });

  doc.fontSize(12)
     .fillColor(COLORS.secondary)
     .text('FjordVind FjordVind', { align: 'center' });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
  doc.moveDown();

  doc.fontSize(10).fillColor(COLORS.text);
  doc.text(`Generert: ${formatDate(new Date())}`);
  doc.text(`Antall tellinger: ${samples.length}`);
  doc.moveDown();

  // Statistics
  if (samples.length > 0) {
    const avgAdult = samples.reduce((sum, s) => sum + (parseFloat(s.adult_female_lice) || 0), 0) / samples.length;
    const maxAdult = Math.max(...samples.map(s => parseFloat(s.adult_female_lice) || 0));
    const minAdult = Math.min(...samples.map(s => parseFloat(s.adult_female_lice) || 0));

    doc.fontSize(12).text('Statistikk - Voksne hunnlus:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`• Gjennomsnitt: ${avgAdult.toFixed(2)}`);
    doc.text(`• Maksimum: ${maxAdult.toFixed(2)}`);
    doc.text(`• Minimum: ${minAdult.toFixed(2)}`);
  }

  doc.moveDown();

  // Recent samples
  doc.fontSize(12).text('Siste tellinger:', { underline: true });
  doc.moveDown(0.5);

  let y = doc.y;
  samples.slice(0, 20).forEach(s => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }

    const adultFemale = parseFloat(s.adult_female_lice) || 0;
    doc.fontSize(9)
       .fillColor(adultFemale >= 0.5 ? COLORS.danger : COLORS.text)
       .text(
         `${formatDateShort(s.counted_at)} - ${s.locality_name || 'Ukjent'} / ${s.merd_name || 'Merd'}: ${adultFemale.toFixed(2)} voksne hunnlus`,
         50, y
       );
    y += 15;
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

module.exports = {
  generateMattilsynetReport,
  generateTreatmentReport,
  generateLiceSummaryReport,
  getWeekNumber,
  COLORS
};
