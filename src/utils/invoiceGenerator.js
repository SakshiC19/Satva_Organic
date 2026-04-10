import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from './logo';
import { signatureBase64 } from './signature';

export const generateInvoice = (order) => {
  const doc = new jsPDF();
  
  // --- Constants & Config ---
  const startX = 14;
  const startY = 10;
  const fullWidth = 182;
  const headerHeight = 40;
  const logoBoxWidth = 41;
  const logoBoxRightX = startX + logoBoxWidth; // 55
  
  // Fonts
  doc.setFont('helvetica');
  
  // --- Header Section ---
  // Outer Box
  doc.rect(startX, startY, fullWidth, headerHeight);
  
  // Vertical Line for Logo
  doc.line(logoBoxRightX, startY, logoBoxRightX, startY + headerHeight);
  
  // Logo
  if (logoBase64) {
    try {
      // Center logo in the 41mm wide box
      doc.addImage(logoBase64, 'JPEG', startX + 2, startY + 5, 37, 25); 
    } catch (e) {
      console.error("Error adding logo", e);
    }
  }
  
  // Header Text Content
  const textLeftX = logoBoxRightX + 2;
  
  // "Tax Invoice" - Centered in the right section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Invoice', 125.5, startY + 5, { align: 'center' });
  
  // Sold By
  doc.setFontSize(9);
  doc.text('Sold By:  Satva Organics', textLeftX, startY + 12);
  
  // Address Label (Added space)
  doc.text('Billed And Ship from Addresss:', textLeftX, startY + 18);
  
  // Address Value
  doc.setFont('helvetica', 'normal');
  const addressText = 'Sangli-kolhapur Byepass Road, Village - Jainapur (Jaysingpur), Kolhapur, Maharashtra - 416101';
  const maxAddressWidth = 130; 
  const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);
  doc.text(addressLines, textLeftX, startY + 23);
  
  // GSTIN
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN:', textLeftX, startY + 32);
  doc.setFont('helvetica', 'normal');
  doc.text('27FKXPP7525P1ZS', textLeftX + 15, startY + 32);

  // Email
  doc.setFont('helvetica', 'bold');
  doc.text('Email us at :', textLeftX, startY + 37);
  doc.setFont('helvetica', 'normal');
  doc.text('info.satvaorganics@gmail.com', textLeftX + 25, startY + 37);
  
  // Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 140, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(String(order.orderSerial || order.id.substring(0, 10).toUpperCase()), 168, startY + 12);
  
  // --- Order Details Grid ---
  const gridY = startY + headerHeight; // 45
  const gridHeight = 50;
  const col1W = 55;
  const col2W = 63.5;
  
  // Main Box
  doc.rect(startX, gridY, fullWidth, gridHeight);
  
  // Vertical Lines
  doc.line(startX + col1W, gridY, startX + col1W, gridY + gridHeight);
  doc.line(startX + col1W + col2W, gridY, startX + col1W + col2W, gridY + gridHeight);
  
  // Column 1: Order Details
  let lineY = gridY + 8;
  const gap = 7;
  const labelX = startX + 2;
  const valX = startX + 25;
  
  doc.setFontSize(9);
  
  // Order Id
  doc.setFont('helvetica', 'bold');
  doc.text('Order Id:', labelX, lineY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(order.orderSerial || order.id.substring(0, 8).toUpperCase()), valX, lineY);
  
  lineY += gap;
  // Order Date
  doc.setFont('helvetica', 'bold');
  doc.text('Order Date:', labelX, lineY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(order.createdAt), valX, lineY);
  
  lineY += gap;
  // Invoice Date
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', labelX, lineY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date()), valX, lineY);
  
  lineY += gap;
  // PAN
  doc.setFont('helvetica', 'bold');
  doc.text('PAN:', labelX, lineY);
  
  lineY += gap;
  // CIN
  doc.setFont('helvetica', 'bold');
  doc.text('CIN:', labelX, lineY);
  
  // Column 2: Bill To
  const col2X = startX + col1W + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', col2X, gridY + 8);
  doc.setFont('helvetica', 'normal');
  
  const addressToUse = order.shippingAddress || order.address;
  if (addressToUse) {
    const billAddress = [
      order.customerName || addressToUse.name || 'Guest',
      addressToUse.address || addressToUse.street,
      addressToUse.locality || '',
      `${addressToUse.city || ''}${addressToUse.city && addressToUse.state ? ', ' : ''}${addressToUse.state || ''}`,
      addressToUse.pincode ? `PIN: ${addressToUse.pincode}` : '',
      order.phone || order.phoneNumber || addressToUse.phone ? `Phone: ${order.phone || order.phoneNumber || addressToUse.phone}` : ''
    ].filter(line => line && line.trim() !== '');
    
    billAddress.forEach((line, i) => {
      doc.text(line, col2X, gridY + 15 + (i * 5));
    });
  }
  
  // Column 3: Ship To
  const col3X = startX + col1W + col2W + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Ship To:', col3X, gridY + 8);
  doc.setFont('helvetica', 'normal');
  
  if (addressToUse) {
    const shipAddress = [
      order.customerName || addressToUse.name || 'Guest',
      addressToUse.address || addressToUse.street,
      addressToUse.locality || '',
      `${addressToUse.city || ''}${addressToUse.city && addressToUse.state ? ', ' : ''}${addressToUse.state || ''}`,
      addressToUse.pincode ? `PIN: ${addressToUse.pincode}` : '',
      order.phone || order.phoneNumber || addressToUse.phone ? `Phone: ${order.phone || order.phoneNumber || addressToUse.phone}` : ''
    ].filter(line => line && line.trim() !== '');
    
    shipAddress.forEach((line, i) => {
      doc.text(line, col3X, gridY + 15 + (i * 5));
    });
  }
  
  // --- Numbers Of Items Row ---
  const itemsRowY = gridY + gridHeight; // 95
  const itemsRowHeight = 8;
  doc.rect(startX, itemsRowY, fullWidth, itemsRowHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Numbers Of Items:', startX + 2, itemsRowY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(order.items?.length || 0), startX + 35, itemsRowY + 5.5);
  
  // --- Items Table ---
  const tableY = itemsRowY + itemsRowHeight; // 103
  
  // Prepare Table Data
  const items = order.items || [];
  const tableData = [];
  
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  
  items.forEach(item => {
    const price = item.price || 0;
    const qty = item.quantity || 1;
    const lineTotal = price * qty;            // Total incl. GST (admin price × qty)
    const grossAmt = lineTotal / 1.05;        // Base price excl. 5% GST
    const gstAmt = lineTotal - grossAmt;      // 5% GST portion
    const cgst = gstAmt / 2;                  // CGST = 2.5%
    const sgst = gstAmt / 2;                  // SGST = 2.5%

    subtotal += lineTotal;
    totalCgst += cgst;
    totalSgst += sgst;
    
    tableData.push([
      item.name || 'Product',
      item.name || 'Product',       // Title
      qty,
      grossAmt.toFixed(2),          // Gross Amount (excl. GST)
      '0.00',                       // Discount
      grossAmt.toFixed(2),          // Taxable Value = Gross Amount
      cgst.toFixed(2),              // CGST (2.5%)
      sgst.toFixed(2),              // SGST (2.5%)
      `Rs. ${lineTotal.toFixed(2)}`          // Total (incl. GST)
    ]);
  });
  
  autoTable(doc, {
    startY: tableY,
    head: [['Product', 'Title', 'Qty', 'Gross\nAmount', 'Discount', 'Taxble\nValue', 'CGST', 'SGST', 'Total']],
    body: tableData,
    theme: 'plain', 
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle',
      minCellHeight: 8
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 15, halign: 'right' },
      8: { cellWidth: 21, halign: 'right' }
    },
    margin: { left: startX, right: 14 } 
  });
  
  // --- Total Row (Below Table) ---
  const finalY = doc.lastAutoTable.finalY;
  const totalRowHeight = 8;
  
  doc.rect(startX, finalY, fullWidth, totalRowHeight);
  
  // Vertical lines for Total row
  let currentX = startX;
  const colWidths = [35, 35, 10, 18, 15, 18, 15, 15, 21];
  
  colWidths.forEach(w => {
    currentX += w;
    doc.line(currentX, finalY, currentX, finalY + totalRowHeight);
  });
  
  // "Total" Text and Amount
  doc.setFont('helvetica', 'bold');
  doc.text('Total', startX + 35 + 2, finalY + 5.5);

  // CGST total (column 6 position)
  const cgstColCenterX = startX + 35 + 35 + 10 + 18 + 15 + 18 + 7.5; // accumulated widths to center of 15-width col
  doc.text(totalCgst.toFixed(2), cgstColCenterX, finalY + 5.5, { align: 'center' });

  // SGST total (column 7 position)
  const sgstColCenterX = cgstColCenterX + 15; // 15 is the width of CGST column
  doc.text(totalSgst.toFixed(2), sgstColCenterX, finalY + 5.5, { align: 'center' });

  // Grand total (last column)
  doc.text(`Rs. ${subtotal.toFixed(2)}`, startX + fullWidth - 2, finalY + 5.5, { align: 'right' });
  
  // --- Footer Section ---
  const footerY = finalY + totalRowHeight;
  const footerHeight = 75;
  
  // Outer Footer Box
  doc.rect(startX, footerY, fullWidth, footerHeight);
  
  // Vertical Line splitting Left (Empty) and Right (Totals/Signatory)
  const footerSplitX = 135;
  doc.line(footerSplitX, footerY, footerSplitX, footerY + footerHeight);
  
  // Shipping Charges Box
  const shippingBoxY = footerY;
  const shippingBoxHeight = 8;
  doc.line(footerSplitX, shippingBoxY + shippingBoxHeight, startX + fullWidth, shippingBoxY + shippingBoxHeight);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipping Charges:', footerSplitX + 2, shippingBoxY + 5.5);
  
  const deliveryCharge = order.deliveryCharge || 0;
  doc.setFont('helvetica', 'normal');
  doc.text(deliveryCharge.toFixed(2), startX + fullWidth - 2, shippingBoxY + 5.5, { align: 'right' });
  
  // Grand Total Box
  const grandTotalBoxY = shippingBoxY + shippingBoxHeight;
  const grandTotalBoxHeight = 8;

  // CGST Row
  const cgstRowY = grandTotalBoxY;
  doc.line(footerSplitX, cgstRowY + grandTotalBoxHeight, startX + fullWidth, cgstRowY + grandTotalBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('CGST (2.5%):', footerSplitX + 2, cgstRowY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(totalCgst.toFixed(2), startX + fullWidth - 2, cgstRowY + 5.5, { align: 'right' });

  // SGST Row
  const sgstRowY = cgstRowY + grandTotalBoxHeight;
  doc.line(footerSplitX, sgstRowY + grandTotalBoxHeight, startX + fullWidth, sgstRowY + grandTotalBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('SGST (2.5%):', footerSplitX + 2, sgstRowY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(totalSgst.toFixed(2), startX + fullWidth - 2, sgstRowY + 5.5, { align: 'right' });

  const discount = order.discount || 0;
  const codCharge = order.codCharge || 0;

  // COD Charge Row (If applicable)
  const codRowY = sgstRowY + grandTotalBoxHeight;
  let finalGrandTotalY = codRowY;
  
  if (codCharge > 0) {
    doc.line(footerSplitX, codRowY + grandTotalBoxHeight, startX + fullWidth, codRowY + grandTotalBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('COD Handling:', footerSplitX + 2, codRowY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(codCharge.toFixed(2), startX + fullWidth - 2, codRowY + 5.5, { align: 'right' });
    finalGrandTotalY = codRowY + grandTotalBoxHeight;
  }

  // Grand Total Row
  const grandTotalActualY = finalGrandTotalY;
  doc.line(footerSplitX, grandTotalActualY + grandTotalBoxHeight, startX + fullWidth, grandTotalActualY + grandTotalBoxHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', footerSplitX + 2, grandTotalActualY + 5.5);
  
  const finalTotal = subtotal + deliveryCharge + codCharge - discount;
  
  doc.text(`Rs. ${finalTotal.toFixed(2)}`, startX + fullWidth - 2, grandTotalActualY + 5.5, { align: 'right' });
  
  // Center X for the right-side box (from footerSplitX (135) to startX+fullWidth (196))
  const rightBoxCenterX = footerSplitX + ((startX + fullWidth) - footerSplitX) / 2;

  // Signature (in place of Satva Organics)
  if (signatureBase64) {
    try {
      const sigWidth = 30;
      const sigHeight = 15;
      const sigY = footerY + footerHeight - 28; // Places it with a comfortable gap above the text
      doc.addImage(signatureBase64, 'JPEG', rightBoxCenterX - (sigWidth / 2), sigY, sigWidth, sigHeight);
    } catch (e) {
      console.error("Error adding signature", e);
    }
  }

  // Authorized Signatory
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', rightBoxCenterX, footerY + footerHeight - 5, { align: 'center' });

  // E & OE
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('E & OE', startX + 2, footerY + footerHeight - 5);

  return doc;
};

export const downloadInvoice = (order) => {
  const doc = generateInvoice(order);
  const displayId = order.orderSerial || order.id.substring(0, 10);
  const fileName = `Invoice_${displayId}_${Date.now()}.pdf`;
  doc.save(fileName);
};

export const viewInvoice = (order) => {
  const doc = generateInvoice(order);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

const formatDate = (timestamp) => {
  if (!timestamp) return new Date().toLocaleDateString('en-IN');
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return new Date().toLocaleDateString('en-IN');
  }
};