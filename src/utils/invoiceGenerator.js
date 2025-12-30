export const generateInvoice = (order) => {
  const invoiceWindow = window.open('', '_blank');
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${order.id.substring(0, 8)}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #27ae60; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { margin: 0; color: #555; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .info-group h3 { margin-top: 0; font-size: 16px; color: #555; }
        .info-group p { margin: 5px 0; font-size: 14px; color: #777; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f8f9fa; color: #555; font-weight: 600; text-align: left; padding: 12px; border-bottom: 2px solid #eee; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
        .total-section { display: flex; justify-content: flex-end; }
        .total-table { width: 300px; }
        .total-table td { border: none; padding: 5px 12px; }
        .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #eee; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
        @media print {
          body { padding: 0; }
          .invoice-box { box-shadow: none; border: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="logo">Satva Organics</div>
          <div class="invoice-details">
            <h2>INVOICE</h2>
            <p>#${order.id.substring(0, 8).toUpperCase()}</p>
            <p>${formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div class="invoice-info">
          <div class="info-group">
            <h3>Bill To:</h3>
            <p><strong>${order.customerName || 'Guest Customer'}</strong></p>
            <p>${order.shippingAddress?.street || ''}</p>
            <p>${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zipCode || ''}</p>
            <p>${order.shippingAddress?.phone || ''}</p>
            <p>${order.email || ''}</p>
          </div>
          <div class="info-group" style="text-align: right;">
            <h3>Payment Method:</h3>
            <p>${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            <p>Status: <strong>${order.status?.toUpperCase()}</strong></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(item => `
              <tr>
                <td>
                  <strong>${item.name}</strong>
                  <br>
                  <span style="font-size: 12px; color: #888;">${item.selectedSize || ''}</span>
                </td>
                <td>₹${item.price}</td>
                <td>${item.quantity}</td>
                <td style="text-align: right;">₹${item.price * item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <table class="total-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${order.subtotal || order.totalAmount}</td>
            </tr>
            <tr>
              <td>Shipping:</td>
              <td style="text-align: right;">₹${order.shippingCost || 0}</td>
            </tr>
            <tr class="total-row">
              <td style="padding-top: 10px;">Total:</td>
              <td style="text-align: right; padding-top: 10px;">₹${order.totalAmount}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Satva Organics | support@satvaorganics.com | +91 1234567890</p>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  invoiceWindow.document.write(invoiceHTML);
  invoiceWindow.document.close();
};
