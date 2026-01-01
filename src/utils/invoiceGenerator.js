import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (order) => {
  const doc = new jsPDF();
  
  // Company/Store Details
  const companyName = 'Satva Organics';
  const companyAddress = 'Organic Products Store';
  const companyPhone = '+91 1234567890';
  const companyEmail = 'info@satvaorganics.com';
  const companyGST = 'GSTIN: 27XXXXX1234X1ZX';
  
  // Colors
  const primaryColor = [39, 174, 96]; // #27ae60
  const darkColor = [31, 45, 38]; // #1F2D26
  const lightGray = [248, 249, 250];
  
  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 15, 20);
  
  // Invoice Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', 15, 30);
  
  // Invoice Number and Date (Right aligned)
  doc.setFontSize(10);
  doc.text(`Invoice #: ${order.id.substring(0, 10)}`, 140, 20);
  doc.text(`Date: ${formatDate(order.createdAt)}`, 140, 27);
  doc.text(`Status: ${order.status || 'Pending'}`, 140, 34);
  
  // Reset text color
  doc.setTextColor(...darkColor);
  
  // Company Details Box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 15, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 15, 56);
  doc.text(companyAddress, 15, 61);
  doc.text(`Phone: ${companyPhone}`, 15, 66);
  doc.text(`Email: ${companyEmail}`, 15, 71);
  doc.text(companyGST, 15, 76);
  
  // Customer Details Box
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 120, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customerName || 'Guest Customer', 120, 56);
  
  if (order.address) {
    const addressLines = [
      order.address.street,
      `${order.address.city}, ${order.address.state}`,
      `PIN: ${order.address.pincode}`,
    ].filter(Boolean);
    
    addressLines.forEach((line, index) => {
      doc.text(line, 120, 61 + (index * 5));
    });
  }
  
  if (order.phone) {
    doc.text(`Phone: ${order.phone}`, 120, 76);
  }
  if (order.email) {
    doc.text(`Email: ${order.email}`, 120, 81);
  }
  
  // Items Table
  const tableStartY = 90;
  
  // Prepare table data
  const tableData = order.items?.map((item, index) => [
    index + 1,
    item.name || 'Product',
    item.size || '-',
    item.quantity || 1,
    `₹${(item.price || 0).toFixed(2)}`,
    `₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`
  ]) || [];

  // Add table
  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Product Name', 'Size', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });
  
  // Calculate totals
  const finalY = doc.lastAutoTable.finalY + 10;
  const subtotal = order.items?.reduce((sum, item) => 
    sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
  const deliveryCharge = order.deliveryCharge || 0;
  const discount = order.discount || 0;
  const tax = order.tax || 0;
  const total = order.total || subtotal + deliveryCharge - discount + tax;
  
  // Totals Box
  const totalsX = 130;
  doc.setFontSize(10);
  
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`₹${subtotal.toFixed(2)}`, 185, finalY, { align: 'right' });
  
  if (deliveryCharge > 0) {
    doc.text('Delivery Charge:', totalsX, finalY + 6);
    doc.text(`₹${deliveryCharge.toFixed(2)}`, 185, finalY + 6, { align: 'right' });
  }
  
  if (discount > 0) {
    doc.text('Discount:', totalsX, finalY + 12);
    doc.text(`-₹${discount.toFixed(2)}`, 185, finalY + 12, { align: 'right' });
  }
  
  if (tax > 0) {
    doc.text('Tax (GST):', totalsX, finalY + 18);
    doc.text(`₹${tax.toFixed(2)}`, 185, finalY + 18, { align: 'right' });
  }
  
  // Total line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX, finalY + 24, 195, finalY + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Amount:', totalsX, finalY + 31);
  doc.text(`₹${total.toFixed(2)}`, 185, finalY + 31, { align: 'right' });
  
  // Payment Information
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const paymentY = finalY + 40;
  doc.text('Payment Method:', 15, paymentY);
  doc.setFont('helvetica', 'bold');
  doc.text(order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment', 50, paymentY);
  
  if (order.paymentMethod !== 'cod') {
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Status:', 15, paymentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PAID', 50, paymentY + 6);
    doc.setTextColor(...darkColor);
  }
  
  // Footer
  const footerY = 270;
  doc.setFillColor(...lightGray);
  doc.rect(0, footerY, 210, 27, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for shopping with Satva Organics!', 105, footerY + 8, { align: 'center' });
  doc.text('For any queries, contact us at ' + companyEmail, 105, footerY + 14, { align: 'center' });
  
  // Terms and Conditions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Terms: All sales are final. Returns accepted within 7 days with original packaging.', 105, footerY + 20, { align: 'center' });
  
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