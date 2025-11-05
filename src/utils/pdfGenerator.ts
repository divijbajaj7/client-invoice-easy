import jsPDF from 'jspdf';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  gst_rate?: number;
  gst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  cgst_rate?: number;
  cgst_amount?: number;
  total_amount: number;
  items: InvoiceItem[];
  notes?: string;
  companies?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
    pan_number?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    branch?: string;
  };
  clients?: {
    name: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
  };
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  // Company details (use dynamic data from invoice or fallback to defaults)
  const companyDetails = {
    name: invoice.companies?.name || "THINKLYTICS AI CONSULTING LLP",
    address: invoice.companies?.address || "B-12, East Baldev Park, Krishna Nagar, Delhi-110051",
    bankName: invoice.companies?.bank_name || "IDFC FIRST BANK",
    accountNumber: invoice.companies?.account_number || "79999858727",
    ifsc: invoice.companies?.ifsc_code || "IDFB0020138",
    branch: invoice.companies?.branch || "Mayur Vihar",
    pan: invoice.companies?.pan_number || "AAYFT2120L",
    gst: invoice.companies?.gst_number || "",
    phone: invoice.companies?.phone || "+91-9999858727",
    email: invoice.companies?.email || "thinklyticsaiconsulting@gmail.com"
  };
  
  let yPos = 40;
  
  // Header - INVOICE title centered
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const invoiceTitle = 'INVOICE';
  const titleWidth = doc.getTextWidth(invoiceTitle);
  doc.text(invoiceTitle, (pageWidth - titleWidth) / 2, yPos);
  
  // Invoice number centered below title
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  const invoiceNumberText = `Invoice #${invoice.invoice_number}`;
  const numberWidth = doc.getTextWidth(invoiceNumberText);
  doc.text(invoiceNumberText, (pageWidth - numberWidth) / 2, yPos);
  
  yPos += 25;
  
  // From and To sections side by side
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('From:', margin, yPos);
  doc.text('To:', pageWidth / 2 + 10, yPos);
  
  yPos += 10;
  
  // From section (Company details) - left side
  const leftColumnX = margin;
  const rightColumnX = pageWidth / 2 + 10;
  const maxColumnWidth = (pageWidth / 2) - 30;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDetails.name, leftColumnX, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  // Split company address into lines with proper width
  const fromAddressLines = doc.splitTextToSize(companyDetails.address, maxColumnWidth);
  fromAddressLines.forEach((line: string) => {
    doc.text(line, leftColumnX, yPos);
    yPos += 6;
  });
  
  if (companyDetails.phone) {
    doc.text(`Phone: ${companyDetails.phone}`, leftColumnX, yPos);
    yPos += 6;
  }
  
  if (companyDetails.email) {
    const emailLines = doc.splitTextToSize(`Email: ${companyDetails.email}`, maxColumnWidth);
    emailLines.forEach((line: string) => {
      doc.text(line, leftColumnX, yPos);
      yPos += 6;
    });
  }
  
  if (companyDetails.gst) {
    doc.text(`GST: ${companyDetails.gst}`, leftColumnX, yPos);
    yPos += 6;
  }
  
  // To section (Client details) - right side
  let clientYPos = 85;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  if (invoice.clients) {
    const clientName = invoice.clients.name;
    doc.text(clientName, rightColumnX, clientYPos);
    
    clientYPos += 8;
    doc.setFont('helvetica', 'normal');
    
    if (invoice.clients.company_name) {
      doc.text(invoice.clients.company_name, rightColumnX, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.address) {
      const toAddressLines = doc.splitTextToSize(invoice.clients.address, maxColumnWidth);
      toAddressLines.forEach((line: string) => {
        doc.text(line, rightColumnX, clientYPos);
        clientYPos += 6;
      });
    }
    
    if (invoice.clients.phone) {
      doc.text(`Phone: ${invoice.clients.phone}`, rightColumnX, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.email) {
      const emailLines = doc.splitTextToSize(`Email: ${invoice.clients.email}`, maxColumnWidth);
      emailLines.forEach((line: string) => {
        doc.text(line, rightColumnX, clientYPos);
        clientYPos += 6;
      });
    }
    
    if (invoice.clients.gst_number) {
      doc.text(`GST: ${invoice.clients.gst_number}`, rightColumnX, clientYPos);
    }
  }
  
  // Invoice Date
  yPos = Math.max(yPos, clientYPos) + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Invoice Date', leftColumnX, yPos);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-GB'), leftColumnX, yPos + 8);
  
  yPos += 25;
  
  // Items table with proper column widths
  const tableStartY = yPos;
  const tableWidth = pageWidth - 2 * margin;
  
  // Column widths for proper alignment
  const descriptionWidth = tableWidth * 0.5;  // 50% for description
  const quantityWidth = tableWidth * 0.15;    // 15% for quantity  
  const rateWidth = tableWidth * 0.175;       // 17.5% for rate
  const amountWidth = tableWidth * 0.175;     // 17.5% for amount
  
  const descriptionX = margin + 5;
  const quantityX = margin + descriptionWidth;
  const rateX = quantityX + quantityWidth;
  const amountX = rateX + rateWidth;
  
  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, tableWidth, 12, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Description', descriptionX, yPos + 8);
  doc.text('Quantity', quantityX + 5, yPos + 8);
  doc.text('Rate', rateX + 5, yPos + 8);
  doc.text('Amount', amountX + 5, yPos + 8);
  
  yPos += 12;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, index) => {
      // Description with proper width - split into lines first
      const descLines = doc.splitTextToSize(item.description, descriptionWidth - 10);
      const lineCount = Math.min(descLines.length, 2); // Maximum 2 lines
      const rowHeight = lineCount > 1 ? 25 : 15; // Taller row for multiple lines
      
      // Row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, tableWidth, rowHeight, 'F');
      }
      
      // Row border
      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, yPos, tableWidth, rowHeight);
      
      doc.setTextColor(0, 0, 0);
      
      // Description - print up to 2 lines
      descLines.slice(0, 2).forEach((line, lineIndex) => {
        doc.text(line, descriptionX, yPos + 8 + (lineIndex * 6));
      });
      
      // Quantity, Rate, Amount - center them vertically in the row
      const verticalCenter = yPos + (rowHeight / 2) + 2;
      doc.text(item.quantity.toString(), quantityX + 15, verticalCenter);
      doc.text(`Rs${item.rate.toLocaleString('en-IN')}`, rateX + 5, verticalCenter);
      doc.text(`Rs${item.amount.toLocaleString('en-IN')}`, amountX + 5, verticalCenter);
      
      yPos += rowHeight;
    });
  }
  
  yPos += 15;
  
  // Totals section (right aligned with proper spacing)
  const totalsStartX = pageWidth - 80;
  const totalsValueX = pageWidth - 20;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', totalsStartX, yPos);
  doc.text(`Rs${invoice.subtotal.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  
  // Show IGST if present
  if (invoice.igst_amount && invoice.igst_amount > 0) {
    yPos += 10;
    doc.text(`IGST @ ${invoice.igst_rate}%:`, totalsStartX, yPos);
    doc.text(`Rs${invoice.igst_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  }
  
  // Show SGST if present
  if (invoice.sgst_amount && invoice.sgst_amount > 0) {
    yPos += 10;
    doc.text(`SGST @ ${invoice.sgst_rate}%:`, totalsStartX, yPos);
    doc.text(`Rs${invoice.sgst_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  }
  
  // Show CGST if present
  if (invoice.cgst_amount && invoice.cgst_amount > 0) {
    yPos += 10;
    doc.text(`CGST @ ${invoice.cgst_rate}%:`, totalsStartX, yPos);
    doc.text(`Rs${invoice.cgst_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  }
  
  // Total
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total:', totalsStartX, yPos);
  doc.text(`Rs${invoice.total_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  
  yPos += 20;
  
  // Banking Details - exactly matching the view layout
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Banking Details:', leftColumnX, yPos);
  
  yPos += 15;
  
  // Create exact 2x3 grid structure like in the view with better spacing
  const bankingStartY = yPos;
  const rowHeight = 22; // Reduced height
  const leftColWidth = 85; // Reduced width
  const rightColX = leftColumnX + leftColWidth + 25; // Reduced gap
  const maxTextWidth = 80; // Maximum width for text wrapping
  
  // Background rectangle
  doc.setFillColor(245, 245, 245);
  doc.rect(leftColumnX, bankingStartY, pageWidth - 2 * margin, rowHeight * 3, 'F');
  
  // Row 1: Bank Name | Account Name  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Bank Name', leftColumnX + 5, bankingStartY + 8);
  doc.text('Account Name', rightColX, bankingStartY + 8);
  
  doc.setFontSize(9); // Reduced font size
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyDetails.bankName, leftColumnX + 5, bankingStartY + 16);
  
  // Split long account name into multiple lines if needed
  const accountNameLines = doc.splitTextToSize(companyDetails.name, maxTextWidth);
  let accountNameY = bankingStartY + 16;
  accountNameLines.forEach((line: string, index: number) => {
    doc.text(line, rightColX, accountNameY);
    if (index === 0) accountNameY += 8; // Only add spacing after first line
  });
  
  // Row 2: Account Number | IFSC Code
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Account Number', leftColumnX + 5, bankingStartY + rowHeight + 8);
  doc.text('IFSC Code', rightColX, bankingStartY + rowHeight + 8);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyDetails.accountNumber, leftColumnX + 5, bankingStartY + rowHeight + 16);
  doc.text(companyDetails.ifsc, rightColX, bankingStartY + rowHeight + 16);
  
  // Row 3: Branch | PAN Number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Branch', leftColumnX + 5, bankingStartY + (rowHeight * 2) + 8);
  doc.text('PAN Number', rightColX, bankingStartY + (rowHeight * 2) + 8);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyDetails.branch, leftColumnX + 5, bankingStartY + (rowHeight * 2) + 16);
  doc.text(companyDetails.pan, rightColX, bankingStartY + (rowHeight * 2) + 16);
  
  yPos = bankingStartY + (rowHeight * 3) + 10;
  
  // Notes if any
  if (invoice.notes) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes:', leftColumnX, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(64, 64, 64);
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      doc.text(line, leftColumnX, yPos);
      yPos += 6;
    });
  }
  
  // Electronic signature disclaimer
  yPos += 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  const disclaimerText = "This invoice is electronically generated and does not require a physical signature.";
  const disclaimerWidth = doc.getTextWidth(disclaimerText);
  doc.text(disclaimerText, (pageWidth - disclaimerWidth) / 2, yPos);
  
  // Download the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  
  return doc;
};