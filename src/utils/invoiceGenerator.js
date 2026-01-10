import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from './logo';

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
  // Right section width = 182 - 41 = 141. Center is 55 + (141/2) = 125.5
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Invoice', 125.5, startY + 5, { align: 'center' });
  
  // Sold By
  doc.setFontSize(9);
  doc.text('Sold By:  Satva Organics', textLeftX, startY + 12);
  
  // Address Label
  doc.text('Billed And Ship from Addresss:', textLeftX, startY + 17);
  
  // Address Value
  doc.setFont('helvetica', 'normal');
  const addressText = 'Sangli-kolhapur Byepass Road, Village - Jainapur (Jaysingpur), Kolhapur, Maharashtra - 416101';
  // Calculate available width: Total Width (182) - Logo Box (41) - Label Offset (~50) - Margin (2)
  const maxAddressWidth = 85; 
  const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);
  doc.text(addressLines, textLeftX + 50, startY + 17);
  
  // GSTIN
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN:', textLeftX, startY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text('27XXXXX1234X1ZX', textLeftX + 15, startY + 29);

  // Email
  doc.setFont('helvetica', 'bold');
  doc.text('Email us at :', textLeftX, startY + 34);
  doc.setFont('helvetica', 'normal');
  doc.text('info@satvaorganics.com', textLeftX + 25, startY + 34);
  
  // Invoice Number (Right aligned roughly)
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 140, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(order.id.substring(0, 10).toUpperCase(), 168, startY + 12);
  
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
  doc.text(order.id.substring(0, 8).toUpperCase(), valX, lineY);
  
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
  
  if (order.address) {
    const billAddress = [
      order.customerName || 'Guest',
      order.address.street,
      `${order.address.city}, ${order.address.state}`,
      `PIN: ${order.address.pincode}`,
      `Phone: ${order.phone || ''}`
    ].filter(Boolean);
    
    billAddress.forEach((line, i) => {
      doc.text(line, col2X, gridY + 15 + (i * 5));
    });
  }
  
  // Column 3: Ship To
  const col3X = startX + col1W + col2W + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Ship To:', col3X, gridY + 8);
  doc.setFont('helvetica', 'normal');
  
  if (order.address) {
    const shipAddress = [
      order.customerName || 'Guest',
      order.address.street,
      `${order.address.city}, ${order.address.state}`,
      `PIN: ${order.address.pincode}`,
      `Phone: ${order.phone || ''}`
    ].filter(Boolean);
    
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
  const minRows = 8;
  const items = order.items || [];
  const tableData = [];
  
  let subtotal = 0;
  
  items.forEach(item => {
    const price = item.price || 0;
    const qty = item.quantity || 1;
    const gross = price * qty;
    subtotal += gross;
    
    tableData.push([
      item.name || 'Product',
      item.name || 'Product', // Title
      qty,
      `Rs. ${gross.toFixed(2)}`,
      '0.00', // Discount
      `Rs. ${gross.toFixed(2)}`, // Taxable
      '0.00', // CGST
      '0.00', // SGST
      `Rs. ${gross.toFixed(2)}` // Total
    ]);
  });
  
  // Fill remaining rows
  for (let i = tableData.length; i < minRows; i++) {
    tableData.push(['', '', '', '', '', '', '', '', '']);
  }
  
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
  
  // "Total" Text
  doc.setFont('helvetica', 'bold');
  doc.text('Total', startX + 35 + 2, finalY + 5.5); 
  
  // --- Footer Section ---
  const footerY = finalY + totalRowHeight;
  const footerHeight = 60;
  
  // Outer Footer Box
  doc.rect(startX, footerY, fullWidth, footerHeight);
  
  // Vertical Line splitting Left (Empty) and Right (Totals/Signatory)
  const footerSplitX = 135;
  doc.line(footerSplitX, footerY, footerSplitX, footerY + footerHeight);
  
  // Shipping Charges Box (Top of Right Footer)
  const shippingBoxY = footerY;
  const shippingBoxHeight = 8;
  // Draw bottom line for shipping charges (separator between shipping and grand total)
  doc.line(footerSplitX, shippingBoxY + shippingBoxHeight, startX + fullWidth, shippingBoxY + shippingBoxHeight);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipping Charges:', footerSplitX + 2, shippingBoxY + 5.5);
  
  const deliveryCharge = order.deliveryCharge || 0;
  doc.setFont('helvetica', 'normal');
  doc.text(`Rs. ${deliveryCharge.toFixed(2)}`, startX + fullWidth - 2, shippingBoxY + 5.5, { align: 'right' });
  
  // Grand Total Box (Below Shipping Charges)
  const grandTotalBoxY = shippingBoxY + shippingBoxHeight;
  const grandTotalBoxHeight = 8;
  // Draw bottom line for Grand Total
  doc.line(footerSplitX, grandTotalBoxY + grandTotalBoxHeight, startX + fullWidth, grandTotalBoxY + grandTotalBoxHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', footerSplitX + 2, grandTotalBoxY + 5.5);
  
  // Calculate Grand Total Value
  const discount = order.discount || 0;
  const finalTotal = subtotal + deliveryCharge - discount;
  
  doc.text(`Rs. ${finalTotal.toFixed(2)}`, startX + fullWidth - 2, grandTotalBoxY + 5.5, { align: 'right' });
  
  // Satva Organics Text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Satva Organics', startX + fullWidth - 25, grandTotalBoxY + 20, { align: 'center' });
  
  // Authorized Signatory
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', startX + fullWidth - 25, footerY + footerHeight - 5, { align: 'center' });

  return doc;
};

export const downloadInvoice = (order) => {
  const doc = generateInvoice(order);
  const fileName = `Invoice_${order.id.substring(0, 10)}_${Date.now()}.pdf`;
  doc.save(fileName);
};

export const viewInvoice = (order) => {
  const doc = generateInvoice(order);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

// Helper function to format date
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