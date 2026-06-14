import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@angular/common';
import { THAI_FONT_BASE64 } from './thai-font';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  constructor() {}

  /**
   * Generates a professional PDF for a given trip data.
   * @param trip The trip object containing all booking details.
   */
  generateTripPdf(trip: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Add valid Thai Font (Sarabun) to jsPDF with explicit style mappings
    doc.addFileToVFS('Sarabun-Regular.ttf', THAI_FONT_BASE64);
    doc.addFont('Sarabun-Regular.ttf', 'ThaiFont', 'normal');
    doc.addFont('Sarabun-Regular.ttf', 'ThaiFont', 'bold'); // Maps bold requests to out TTF so jsPDF doesn't fallback or corrupt
    doc.setFont('ThaiFont', 'normal'); // Set as default font


    // 1. HEADER - Thailandia Branding (Mimicked via text)
    doc.setFontSize(22); // Reduced from 28
    doc.setFont('ThaiFont', 'bold');
    doc.setTextColor(51, 51, 51); // Dark Grey
    doc.text('Vera', margin, 20);

    
    doc.setTextColor(255, 140, 0); // Primary Orange
    const veraWidth = doc.getTextWidth('Vera');
    doc.text('Thailandia', margin + veraWidth + 2, 20);

    // Subtitle
    doc.setFontSize(9); // Reduced from 10
    doc.setFont('ThaiFont', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Quotation & Booking Summary', margin, 25);

    // Separator line
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageWidth - margin, 28);

    // 2. BOOKING INFO (Date, Ref, Author)
    doc.setFontSize(8.5); // Reduced from 10
    // 2. BOOKING INFO
    let currentY = 40;
    const rowHeight = 7;
    const secondCol = 105;

    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    
    // Header Info - Combined for better rendering
    doc.setFont('ThaiFont', 'bold');
    doc.text(`Reference: ${trip.booking_reference || trip.id || '-'}`, margin, currentY);
    
    const displayDate = trip.created_at ? formatDate(trip.created_at, 'dd/MM/yyyy', 'en-US') : formatDate(new Date(), 'dd/MM/yyyy', 'en-US');
    doc.text(`Date: ${displayDate}`, margin, currentY + rowHeight);
    
    doc.text(`Staff: ${trip.user_name || '-'}`, margin, currentY + rowHeight * 2);

    doc.text(`Client: ${trip.client_name || '-'}`, secondCol, currentY);
    
    const statusText = trip.approved ? 'Approved' : (trip.declined ? 'Declined' : 'Pending');
    doc.text(`Status: ${statusText}`, secondCol, currentY + rowHeight);
    
    doc.text(`PAX: ${trip.number_of_adults || 0} Adults, ${trip.number_of_kids || 0} Kids`, secondCol, currentY + rowHeight * 2);

    currentY = 65;

    // 3. SERVICE TABLES
    
    // --- HOTELS ---
    if (trip.hotels && trip.hotels.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Hotels', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date (In/Out)', 'Hotel Name', 'Room Type', 'Nights', 'S/D Price', 'Total']],
        body: trip.hotels.map((h: any) => [
          `${formatDate(h.from_date, 'dd/MM/yy', 'en-US')} - ${formatDate(h.to_date, 'dd/MM/yy', 'en-US')}`,
          h.hotel_name || '',
          (h.room_type || '').split(',').filter((s: string) => s.trim() !== '').map((s: string, index: number, arr: string[]) => arr.length > 1 ? `${index + 1}. ${s.trim()}` : s.trim()).join('\n'),
          h.nights || 0,
          `S: ${Number(h.single_price || 0).toLocaleString()} / D: ${Number(h.double_price || 0).toLocaleString()}`,
          `${(Number(h.single_price || 0) + Number(h.double_price || 0)).toLocaleString()}`
        ]),
        headStyles: { fillColor: [255, 153, 0] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- TRANSFERS ---
    if (trip.transfers && trip.transfers.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Transfers', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'From', 'To', 'Type', 'Pickup', 'Price']],
        body: trip.transfers.map((t: any) => [
          formatDate(t.from_date, 'dd/MM/yy', 'en-US'),
          t.from_location || '',
          t.to_location || '',
          t.tot || 'PVT',
          t.pickup_time || '-',
          Number(t.price || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- EXCURSIONS ---
    if (trip.excursions && trip.excursions.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Excursions', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Excursion Name', 'Type', 'Pickup', 'Price']],
        body: trip.excursions.map((e: any) => [
          formatDate(e.from_date, 'dd/MM/yy', 'en-US'),
          e.excursion_name || '',
          e.toe || 'PVT',
          e.pickup_time || '-',
          Number(e.price || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- TOURS ---
    if (trip.tours && trip.tours.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Tours', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Tour Name', 'Type', 'Price']],
        body: trip.tours.map((t: any) => [
          formatDate(t.from_date, 'dd/MM/yy', 'en-US'),
          t.tour_name || '',
          t.tot || 'PVT',
          Number(t.price || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- FLIGHTS ---
    if (trip.flights && trip.flights.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Flights', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Flight No.', 'Route', 'Dep/Arr Time', 'Price']],
        body: trip.flights.map((f: any) => [
          formatDate(f.from_date, 'dd/MM/yy', 'en-US'),
          f.flight_number || '',
          f.route || '',
          `${f.edt || '-'} / ${f.eat || '-'}`,
          Number(f.price || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- OTHER SERVICES ---
    if (trip.other && trip.other.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 153, 0);
      doc.text('Other Services', margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Description', 'Price']],
        body: trip.other.map((o: any) => [
          formatDate(o.from_date, 'dd/MM/yy', 'en-US'),
          o.description || 'Other Service',
          Number(o.price || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 8, font: 'ThaiFont' },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // 4. PRICE BREAKDOWN SUMMARY
    const flightsSum = (trip.flights || []).reduce((s: number, f: any) => s + (Number(f.price) || 0), 0);
    const transfersSum = (trip.transfers || []).reduce((s: number, t: any) => s + (Number(t.price) || 0), 0);
    const hotelsSum = (trip.hotels || []).reduce((s: number, h: any) => s + (Number(h.single_price || 0) + Number(h.double_price || 0)), 0);
    const excursionsSum = (trip.excursions || []).reduce((s: number, e: any) => s + (Number(e.price) || 0), 0);
    const toursSum = (trip.tours || []).reduce((s: number, t: any) => s + (Number(t.price) || 0), 0);
    const otherSum = (trip.other || []).reduce((s: number, o: any) => s + (Number(o.price) || 0), 0);
    const assistanceFee = Number(trip.final_amount || 0) - Number(trip.total_amount || 0);

    const summaryData = [];
    if (flightsSum > 0) summaryData.push(['Total Flights Cost', flightsSum.toLocaleString()]);
    if (transfersSum > 0) summaryData.push(['Total Transfers Cost', transfersSum.toLocaleString()]);
    if (hotelsSum > 0) summaryData.push(['Total Hotels Cost', hotelsSum.toLocaleString()]);
    if (excursionsSum > 0) summaryData.push(['Total Excursions Cost', excursionsSum.toLocaleString()]);
    if (toursSum > 0) summaryData.push(['Total Tours Cost', toursSum.toLocaleString()]);
    if (otherSum > 0) summaryData.push(['Total Other Services', otherSum.toLocaleString()]);
    if (assistanceFee > 0) summaryData.push(['Assistance & Service Fee', assistanceFee.toLocaleString()]);

    doc.setFontSize(14);
    doc.setTextColor(255, 153, 0);
    doc.text('Price Breakdown Summary', margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 9, fontStyle: 'bold', font: 'ThaiFont' },
      columnStyles: { 
        0: { cellWidth: 100 }, 
        1: { cellWidth: 50, halign: 'right' } 
      },
      margin: { left: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Total Final Amount:', secondCol + 10, currentY);
    doc.setTextColor(255, 153, 0);
    doc.setFontSize(16);
    doc.text(`${Number(trip.final_amount || 0).toLocaleString()} THB`, secondCol + 60, currentY);

    // 5. FOOTER
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('ThaiFont', 'normal'); // Use ThaiFont in footer
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Thailandia Project - Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        287,
        { align: 'center' }
      );
    }

    // 6. SAVE
    const fileName = `Quotation_${trip.booking_reference || trip.uuid?.slice(0, 8) || trip.id}.pdf`;
    doc.save(fileName);
  }

  /** Formal Invoice PDF — monochromatic professional design. */
  generateInvoicePdf(trip: any, paymentRecord?: any) {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m  = 14;
    const re = pw - m;

    doc.addFileToVFS('Sarabun-Regular.ttf', THAI_FONT_BASE64);
    doc.addFont('Sarabun-Regular.ttf', 'TF', 'normal');
    doc.addFont('Sarabun-Regular.ttf', 'TF', 'bold');
    doc.setFont('TF', 'normal');

    // Colours — Deep orange theme (burnt orange, better contrast)
    const NAVY:  [number,number,number] = [195, 100, 0];   // deep burnt orange
    const DARK:  [number,number,number] = [50,  50,  50];
    const MID:   [number,number,number] = [110, 110, 110];
    const LIGHT: [number,number,number] = [180, 180, 180];
    const BG:    [number,number,number] = [245, 245, 245];
    const BGROW: [number,number,number] = [250, 250, 250];
    const WHITE: [number,number,number] = [255, 255, 255];

    const invoiceYear = new Date().getFullYear();
    const invoiceNum  = `INV-${invoiceYear}-${String(trip.id||'000').padStart(5,'0')}`;
    const issueDate   = formatDate(new Date(),'dd/MM/yyyy','en-US');
    const dueDate     = formatDate(new Date(Date.now()+7*864e5),'dd/MM/yyyy','en-US');

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(...NAVY); doc.rect(0,0,pw,14,'F');
    doc.setFont('TF','bold'); doc.setFontSize(11); doc.setTextColor(...WHITE);
    doc.text('VERA THAILANDIA CO., LTD.', m, 9.5);
    doc.setFontSize(10); doc.text('INVOICE', re, 9.5, {align:'right'});

    // Left column: company address (max ~100mm wide so it never touches the right block)
    doc.setFont('TF','normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
    doc.text('Life Condo Sathorn Soi 10, Bangkok, Thailand 10120', m, 20);
    doc.text('Tel: +66 (0)2 635 3551   |   Email: beppe@verathailandia.com', m, 26);

    // Thin vertical divider between left and right blocks
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
    doc.line(pw/2, 17, pw/2, 29);

    // Right column: invoice meta (labels left-aligned at pw/2+4, values right-aligned)
    const metaLX = pw/2 + 6;
    [['Invoice No. :', invoiceNum],['Issue Date  :', issueDate],['Due Date    :', dueDate]]
      .forEach(([lbl,val],i) => {
        const y = 19 + i*5.5;
        doc.setFont('TF','bold');  doc.setTextColor(...DARK); doc.text(lbl, metaLX, y);
        doc.setFont('TF','normal'); doc.setTextColor(...DARK); doc.text(val, re, y, {align:'right'});
      });

    // Full-width separator line
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(m, 31, re, 31);


    // ── Info boxes (Billed To / Booking Details) ────────────────
    let cy = 36;
    const hw = (pw-m*2-6)/2;
    const c2 = m+hw+6;

    const infoBox = (x:number,w:number,title:string,rows:string[]) => {
      doc.setFillColor(...BG); doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
      doc.rect(x,cy,w,6+rows.length*6,'FD');
      doc.setFillColor(...DARK); doc.rect(x,cy,w,6,'F');
      doc.setFont('TF','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text(title,x+3,cy+4.2);
      doc.setFont('TF','normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
      rows.forEach((r,i)=>doc.text(r,x+3,cy+11+i*6));
    };

    const ts = trip.trip_start_date ? formatDate(trip.trip_start_date,'dd/MM/yyyy','en-US') : '-';
    const st = trip.is_booking ? 'Booking' : (trip.approved ? 'Approved' : 'Pending');
    infoBox(m, hw, 'BILLED TO', [
      `Name  : ${trip.client_name||'-'}`,
      `Tel   : ${trip.client_phone||'-'}`,
      `Email : ${trip.client_email||'-'}`,
      `PAX   : ${trip.number_of_adults||0} Adults / ${trip.number_of_kids||0} Kids`,
    ]);
    infoBox(c2, hw, 'BOOKING DETAILS', [
      `Ref No.    : ${trip.booking_reference||'-'}`,
      `Agent      : ${trip.agent_name||'-'}`,
      `Trip Start : ${ts}`,
      `Status     : ${st}`,
    ]);
    cy += 6+4*6+6;

    // ── Bank Account ─────────────────────────────────────────────
    doc.setFillColor(...BG); doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
    doc.rect(m,cy,re-m,22,'FD');
    doc.setFillColor(...DARK); doc.rect(m,cy,re-m,6,'F');
    doc.setFont('TF','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
    doc.text('PAYMENT / BANK ACCOUNT', m+3, cy+4.2);
    doc.setFont('TF','normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
    const bc = [m+3, m+65, m+132];
    doc.text('Bank     : Kasikorn Bank (KBANK)', bc[0], cy+11);
    doc.text('Acct Name: Vera Thailandia Co., Ltd.', bc[0], cy+17);
    doc.text('Acct No  : 012-3-45678-9', bc[1], cy+11);
    doc.text('Branch   : Sathorn', bc[1], cy+17);
    doc.text('SWIFT    : KASITHBK', bc[2], cy+11);
    doc.text('Currency : THB', bc[2], cy+17);
    cy += 28;

    // ── Helpers ─────────────────────────────────────────────────
    const sfmt = (d:any)=>{ try{return d?formatDate(d,'dd/MM/yy','en-US'):'-';}catch{return '-';} };
    const chk = (n=20)=>{ if(cy+n>ph-22){doc.addPage();cy=16;} };

    const ths = { fillColor:NAVY, textColor:WHITE, fontSize:7.2, font:'TF', fontStyle:'bold' as const, cellPadding:3 };
    const tst = { fontSize:7.5, font:'TF', cellPadding:3, textColor:DARK, lineColor:[210,210,210] as [number,number,number], lineWidth:0.2 };
    const tar = { fillColor:BGROW };

    const sec = (lbl:string)=>{
      chk(18);
      doc.setFont('TF','bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
      doc.text(lbl.toUpperCase(),m,cy);
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(m,cy+1.5,re,cy+1.5);
      cy+=5;
    };

    // ── Service tables ───────────────────────────────────────────
    if(trip.hotels?.length>0){
      sec('Hotels');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Check In/Out','City','Hotel','Room Type','Nights','S/D Price','Total (THB)']],
        body:trip.hotels.map((h:any)=>[
          `${sfmt(h.from_date)} – ${sfmt(h.to_date)}`,h.city||'',h.hotel_name||'',h.room_type||'',h.nights||0,
          `S:${Number(h.single_price||0).toLocaleString()} D:${Number(h.double_price||0).toLocaleString()}`,
          (Number(h.single_price||0)+Number(h.double_price||0)).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }
    if(trip.transfers?.length>0){
      sec('Transfers');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Date','City','From','To','Type','Pickup','Price (THB)']],
        body:trip.transfers.map((t:any)=>[sfmt(t.from_date),t.city||'',t.from_location||'',t.to_location||'',t.tot||'PVT',t.pickup_time||'-',Number(t.price||0).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }
    if(trip.excursions?.length>0){
      sec('Excursions');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Date','City','Excursion','Type','Pickup','Price (THB)']],
        body:trip.excursions.map((e:any)=>[sfmt(e.from_date),e.city||'',e.excursion_name||'',e.toe||'PVT',e.pickup_time||'-',Number(e.price||0).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }
    if(trip.tours?.length>0){
      sec('Tours');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Date','Tour Name','Route','Type','PAX','Price (THB)']],
        body:trip.tours.map((t:any)=>[sfmt(t.from_date),t.tour_name||'',t.from_location||'',t.tot||'PVT',t.pax||'',Number(t.price||0).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }
    if(trip.flights?.length>0){
      sec('Flights');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Date','Airline','Flight No.','In/Out','Route','Dep/Arr','Issued By','Price (THB)']],
        body:trip.flights.map((f:any)=>[sfmt(f.from_date),f.flight_airline||'',f.flight_number||'',f.in_or_out||'',f.route||'',`${f.edt||'-'}/${f.eat||'-'}`,f.issued_by||'-',Number(f.price||0).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }
    if(trip.other?.length>0){
      sec('Other Services');
      autoTable(doc,{startY:cy,showHead:'everyPage',
        head:[['Date','Description','Price (THB)']],
        body:trip.other.map((o:any)=>[sfmt(o.from_date),o.description||'Other Service',Number(o.price||o.amount||0).toLocaleString()]),
        headStyles:ths,styles:tst,alternateRowStyles:tar,margin:{left:m,right:m}});
      cy=(doc as any).lastAutoTable.finalY+8;
    }

    // ── Summary calculations ──────────────────────────────────────
    const sum = (arr:any[],fn:(x:any)=>number)=>arr.reduce((s,x)=>s+fn(x),0);
    const fA = Number(trip.final_amount||0);
    const tA = Number(trip.total_amount||0);
    const assFee = fA-tA;
    const hS  = sum(trip.hotels||[],h=>Number(h.single_price||0)+Number(h.double_price||0));
    const trS = sum(trip.transfers||[],t=>Number(t.price||0));
    const exS = sum(trip.excursions||[],e=>Number(e.price||0));
    const toS = sum(trip.tours||[],t=>Number(t.price||0));
    const flS = sum(trip.flights||[],f=>Number(f.price||0));
    const oS  = sum(trip.other||[],o=>Number(o.price||o.amount||0));
    const amtPaid = Number(paymentRecord?.amount_paid||trip.amount_paid||0);
    const penalty = Number(paymentRecord?.penalty_cost||trip.penalty_cost||0);
    const balance = fA+penalty-amtPaid;

    const bkRows:any[]=[]; 
    if(hS>0)  bkRows.push(['Hotels',`THB ${hS.toLocaleString()}`]);
    if(trS>0) bkRows.push(['Transfers',`THB ${trS.toLocaleString()}`]);
    if(exS>0) bkRows.push(['Excursions',`THB ${exS.toLocaleString()}`]);
    if(toS>0) bkRows.push(['Tours',`THB ${toS.toLocaleString()}`]);
    if(flS>0) bkRows.push(['Flights',`THB ${flS.toLocaleString()}`]);
    if(oS>0)  bkRows.push(['Other Services',`THB ${oS.toLocaleString()}`]);
    if(assFee>0) bkRows.push(['Assistance & Service Fee',`THB ${assFee.toLocaleString()}`]);

    const pmRows:any[]=[
      ['Sub-Total',`THB ${tA.toLocaleString()}`],
      ...(assFee>0?[['Assistance & Service Fee',`THB ${assFee.toLocaleString()}`]]:[]),
      ['TOTAL AMOUNT',`THB ${fA.toLocaleString()}`],
      ...(penalty>0?[['Penalty / Cancellation',`THB ${penalty.toLocaleString()}`]]:[]),
      ['Amount Paid',`THB ${amtPaid.toLocaleString()}`],
      [balance>0?'Balance Due':'Fully Paid / Credit',`THB ${Math.abs(balance).toLocaleString()}`],
    ];
    const totalIdx = pmRows.findIndex(r=>r[0]==='TOTAL AMOUNT');
    const lastIdx  = pmRows.length-1;
    const status   = balance<=0?'FULLY PAID':amtPaid>0?'PARTIALLY PAID':'PAYMENT PENDING';

    chk(bkRows.length*7+70);

    // Two-column summary
    autoTable(doc,{
      startY:cy,
      head:[['Cost Breakdown','Amount']],body:bkRows,
      headStyles:ths,styles:tst,alternateRowStyles:tar,
      columnStyles:{0:{cellWidth:80},1:{cellWidth:38,halign:'right'}},
      margin:{left:m,right:pw/2+4}});

    autoTable(doc,{
      startY:cy,
      head:[['Payment Summary','Amount']],body:pmRows,
      headStyles:ths,styles:tst,alternateRowStyles:tar,
      columnStyles:{0:{cellWidth:52},1:{cellWidth:38,halign:'right'}},
      didParseCell:(d:any)=>{
        if(d.section==='body'&&(d.row.index===totalIdx||d.row.index===lastIdx))
          d.cell.styles.fontStyle='bold';
      },
      margin:{left:pw/2+4,right:m}});

    cy=(doc as any).lastAutoTable.finalY+5;
    doc.setFont('TF','bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
    doc.text(`Payment Status: ${status}`, pw/2+4, cy+4);

    if(trip.remarks){
      doc.setFont('TF','normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
      doc.text(`Remarks: ${trip.remarks}`, m, cy+4);
    }

    // ── Footer on every page ─────────────────────────────────────
    const np=(doc as any).internal.getNumberOfPages();
    for(let i=1;i<=np;i++){
      doc.setPage(i);
      const fy=ph-12;
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(m,fy-5,re,fy-5);
      doc.setFont('TF','normal'); doc.setFontSize(6.5); doc.setTextColor(...LIGHT);
      doc.text('Computer-generated document. No signature required. | Vera Thailandia Co., Ltd.',pw/2,fy-1,{align:'center'});
      doc.text(`${invoiceNum}  |  Issued: ${issueDate}  |  Page ${i} of ${np}`,pw/2,fy+4,{align:'center'});
    }

    doc.save(`Invoice_${invoiceNum}_${(trip.client_name||'Client').replace(/\s+/g,'_')}.pdf`);
  }

  /** Generates a comprehensive PDF for a single catalogue item (Excursion, Tour, or Transfer) */
  generateItemPdf(item: any, category: string) {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 14;
    const re = pw - m;

    doc.addFileToVFS('Sarabun-Regular.ttf', THAI_FONT_BASE64);
    doc.addFont('Sarabun-Regular.ttf', 'TF', 'normal');
    doc.addFont('Sarabun-Regular.ttf', 'TF', 'bold');
    doc.setFont('TF', 'normal');

    const ORANGE: [number, number, number] = [255, 140, 0];
    const DARK:   [number, number, number] = [50, 50, 50];
    const MID:    [number, number, number] = [110, 110, 110];
    const LIGHT:  [number, number, number] = [200, 200, 200];
    const WHITE:  [number, number, number] = [255, 255, 255];
    const BG:     [number, number, number] = [245, 245, 245];

    const sfmt = (d: any) => { try { return d ? formatDate(d, 'dd/MM/yyyy', 'en-US') : '-'; } catch { return d || '-'; } };
    const chk = (n = 20) => { if (cy + n > ph - 22) { doc.addPage(); cy = 16; } };

    const titleMap: any = { 'hotels': 'Hotel', 'tours': 'Tour', 'excursions': 'Excursion', 'transfers': 'Transfer' };
    const catLabel = titleMap[category] || 'Item';
    const issueDate = formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'en-US');

    // ── Header bar ─────────────────────────────────────────────────────────────
    doc.setFillColor(...ORANGE); doc.rect(0, 0, pw, 14, 'F');
    doc.setFont('TF', 'bold'); doc.setFontSize(11); doc.setTextColor(...WHITE);
    doc.text('VERA THAILANDIA CO., LTD.', m, 9.5);
    doc.setFontSize(9); doc.text(`${catLabel.toUpperCase()} DETAILS`, re, 9.5, { align: 'right' });

    doc.setFont('TF', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
    doc.text('Life Condo Sathorn Soi 10, Bangkok, Thailand 10120', m, 20);
    doc.text(`Tel: +66 (0)2 635 3551  |  Email: beppe@verathailandia.com  |  Generated: ${issueDate}`, m, 26);

    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(m, 30, re, 30);

    let cy = 36;

    // ── Section helper ─────────────────────────────────────────────────────────
    const sec = (lbl: string) => {
      chk(14);
      doc.setFont('TF', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
      doc.text(lbl.toUpperCase(), m, cy);
      doc.setDrawColor(...ORANGE); doc.setLineWidth(0.4); doc.line(m, cy + 1.5, re, cy + 1.5);
      cy += 6;
    };

    // ── Info field helper ──────────────────────────────────────────────────────
    const field = (label: string, value: string, x = m, colW = re - m) => {
      chk(10);
      doc.setFont('TF', 'bold'); doc.setFontSize(8); doc.setTextColor(...ORANGE);
      doc.text(label + ':', x, cy);
      const lw = doc.getTextWidth(label + ': ');
      doc.setFont('TF', 'normal'); doc.setTextColor(...DARK);
      // Word-wrap long values
      const maxW = colW - lw - 2;
      const lines = doc.splitTextToSize(value || '-', maxW);
      doc.text(lines, x + lw + 1, cy);
      cy += Math.max(6, lines.length * 5.5);
    };

    const ths = { fillColor: ORANGE, textColor: WHITE, fontSize: 7.5, font: 'TF', fontStyle: 'bold' as const, cellPadding: 3 };
    const tst = { fontSize: 7.5, font: 'TF', cellPadding: 3, textColor: DARK, lineColor: LIGHT as [number,number,number], lineWidth: 0.2 };
    const tar = { fillColor: BG };

    // ══════════════════════════════════════════════════════════════════════════
    // EXCURSION
    // ══════════════════════════════════════════════════════════════════════════
    if (category === 'excursions') {
      sec('Excursion Information');
      const half = (re - m - 6) / 2;
      const c2 = m + half + 6;
      field('Name', item.name, m, half);
      cy -= 6;
      field('Code', item.code, c2, half);
      field('City', item.city, m, half);
      cy -= 6;
      field('Supplier', item.supplier_name, c2, half);
      field('SIC Price Adult', item.sic_price_adult != null ? `${Number(item.sic_price_adult).toLocaleString()} THB` : '-', m, half);
      cy -= 6;
      field('SIC Price Child', item.sic_price_child != null ? `${Number(item.sic_price_child).toLocaleString()} THB` : '-', c2, half);

      if (item.validDays || item.valid_days) {
        const days: any = item.validDays || {};
        const dayNames = Object.entries(days).filter(([, v]) => !!v).map(([k]) => k).join(', ');
        field('Valid Days', dayNames || '-');
      }

      if (item.description) {
        sec('Description');
        chk(16);
        doc.setFont('TF', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(item.description, re - m);
        doc.text(lines, m, cy);
        cy += lines.length * 5.5 + 4;
      }

      // Prices
      const prices: any[] = item.prices || [];
      if (prices.length > 0) {
        sec('Pricing Schedule');
        chk(20);
        const grouped = new Map<string, any>();
        prices.forEach((p: any) => {
          const key = `${p.dateFrom}_${p.dateTo}`;
          if (!grouped.has(key)) grouped.set(key, { dateFrom: p.dateFrom, dateTo: p.dateTo, rows: [] });
          grouped.get(key).rows.push(p);
        });

        grouped.forEach(g => {
          chk(30);
          doc.setFont('TF', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
          doc.text(`Period: ${sfmt(g.dateFrom)} – ${sfmt(g.dateTo)}`, m, cy);
          cy += 4;
          autoTable(doc, {
            startY: cy, showHead: 'everyPage',
            head: [['Pax', 'Price (THB)']],
            body: g.rows.sort((a: any, b: any) => a.pax - b.pax).map((r: any) => [r.pax, Number(r.price || 0).toLocaleString()]),
            headStyles: ths, styles: tst, alternateRowStyles: tar,
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50, halign: 'right' } },
            margin: { left: m, right: m }
          });
          cy = (doc as any).lastAutoTable.finalY + 8;
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TRANSFER
    // ══════════════════════════════════════════════════════════════════════════
    else if (category === 'transfers') {
      sec('Transfer Information');
      const half = (re - m - 6) / 2;
      const c2 = m + half + 6;
      field('Transfer Type', item.transfer_type, m, half);
      cy -= 6;
      field('City', item.city, c2, half);
      field('Departure', item.departure, m, half);
      cy -= 6;
      field('Arrival', item.arrival, c2, half);
      field('SIC Price Adult', item.sic_price_adult != null ? `${Number(item.sic_price_adult).toLocaleString()} THB` : '-', m, half);
      cy -= 6;
      field('SIC Price Child', item.sic_price_child != null ? `${Number(item.sic_price_child).toLocaleString()} THB` : '-', c2, half);

      if (item.description) {
        sec('Description');
        chk(16);
        doc.setFont('TF', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(item.description, re - m);
        doc.text(lines, m, cy);
        cy += lines.length * 5.5 + 4;
      }

      const prices: any[] = item.prices || [];
      if (prices.length > 0) {
        sec('Pricing Schedule');
        const grouped = new Map<string, any>();
        prices.forEach((p: any) => {
          const key = `${p.dateFrom}_${p.dateTo}`;
          if (!grouped.has(key)) grouped.set(key, { dateFrom: p.dateFrom, dateTo: p.dateTo, rows: [] });
          grouped.get(key).rows.push(p);
        });

        grouped.forEach(g => {
          chk(30);
          doc.setFont('TF', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
          doc.text(`Period: ${sfmt(g.dateFrom)} – ${sfmt(g.dateTo)}`, m, cy);
          cy += 4;
          autoTable(doc, {
            startY: cy, showHead: 'everyPage',
            head: [['Pax', 'Price (THB)', 'Cost (THB)']],
            body: g.rows.sort((a: any, b: any) => a.pax - b.pax).map((r: any) => [
              r.pax,
              Number(r.price || 0).toLocaleString(),
              Number(r.cost || 0).toLocaleString()
            ]),
            headStyles: ths, styles: tst, alternateRowStyles: tar,
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 45, halign: 'right' }, 2: { cellWidth: 45, halign: 'right' } },
            margin: { left: m, right: m }
          });
          cy = (doc as any).lastAutoTable.finalY + 8;
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TOUR
    // ══════════════════════════════════════════════════════════════════════════
    else if (category === 'tours') {
      const hotelsList: any[]    = item.hotelsList || [];
      const excList: any[]       = item.excursionsList || [];
      const transList: any[]     = item.transfersList || [];

      const getHotelName  = (id: string) => hotelsList.find(h => String(h.id) === String(id))?.name || id || '-';
      const getExcName    = (id: string) => excList.find(e => String(e.id) === String(id))?.name || id || '-';
      const getTransName  = (id: string) => {
        const t = transList.find(t => String(t.id) === String(id));
        return t ? `${t.transfer_type || ''} ${t.departure || ''} → ${t.arrival || ''}`.trim() : id || '-';
      };

      sec('Tour Information');
      const half = (re - m - 6) / 2;
      const c2 = m + half + 6;
      field('Tour Name', item.name, m, half);
      cy -= 6;
      field('Category', item.category, c2, half);
      field('Start City', item.city, m, half);
      cy -= 6;
      field('Route', item.route, c2, half);
      field('Departure Type', item.departures, m, half);
      cy -= 6;
      field('Duration', `${(item.itinerary || []).length} Days`, c2, half);

      if (item.validDays) {
        const days: any = item.validDays;
        const dayNames = Object.entries(days).filter(([, v]) => !!v).map(([k]) => k).join(', ');
        field('Valid Days', dayNames || '-');
      }

      if (item.description) {
        sec('Description');
        chk(16);
        doc.setFont('TF', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(item.description, re - m);
        doc.text(lines, m, cy);
        cy += lines.length * 5.5 + 4;
      }

      // Itinerary
      const itinerary: any[] = item.itinerary || [];
      if (itinerary.length > 0) {
        sec('Itinerary Details');
        itinerary.forEach((day: any) => {
          chk(30);
          // Day header
          doc.setFillColor(...DARK); doc.rect(m, cy, re - m, 7, 'F');
          doc.setFont('TF', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
          doc.text(`Day ${day.dayNumber}`, m + 3, cy + 5);
          cy += 10;

          if (day.description) {
            chk(12);
            doc.setFont('TF', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
            const descLines = doc.splitTextToSize(day.description, re - m - 4);
            doc.text(descLines, m + 2, cy);
            cy += descLines.length * 5 + 4;
          }

          // Hotels
          if (day.hotels?.length > 0) {
            chk(20);
            const hotelRows = day.hotels.map((h: any) => [
              h.from_time || '-',
              h.to_time || '-',
              h.city || '-',
              getHotelName(h.item_id),
              h.room_type || '-'
            ]);
            doc.setFont('TF', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...MID);
            doc.text('HOTELS', m + 2, cy); cy += 3;
            autoTable(doc, {
              startY: cy,
              head: [['From', 'To', 'City', 'Hotel', 'Room Type']],
              body: hotelRows,
              headStyles: { ...ths, fillColor: [80, 80, 80] },
              styles: tst, alternateRowStyles: tar,
              margin: { left: m + 2, right: m }
            });
            cy = (doc as any).lastAutoTable.finalY + 5;
          }

          // Excursions
          if (day.excursions?.length > 0) {
            chk(20);
            const excRows = day.excursions.map((e: any) => [
              e.from_time || '-',
              e.to_time || '-',
              e.city || '-',
              getExcName(e.item_id)
            ]);
            doc.setFont('TF', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...MID);
            doc.text('EXCURSIONS', m + 2, cy); cy += 3;
            autoTable(doc, {
              startY: cy,
              head: [['From', 'To', 'City', 'Excursion']],
              body: excRows,
              headStyles: { ...ths, fillColor: [80, 80, 80] },
              styles: tst, alternateRowStyles: tar,
              margin: { left: m + 2, right: m }
            });
            cy = (doc as any).lastAutoTable.finalY + 5;
          }

          // Transfers
          if (day.transfers?.length > 0) {
            chk(20);
            const transRows = day.transfers.map((t: any) => [
              t.from_time || '-',
              t.to_time || '-',
              t.city || '-',
              getTransName(t.item_id)
            ]);
            doc.setFont('TF', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...MID);
            doc.text('TRANSFERS', m + 2, cy); cy += 3;
            autoTable(doc, {
              startY: cy,
              head: [['From', 'To', 'City', 'Transfer']],
              body: transRows,
              headStyles: { ...ths, fillColor: [80, 80, 80] },
              styles: tst, alternateRowStyles: tar,
              margin: { left: m + 2, right: m }
            });
            cy = (doc as any).lastAutoTable.finalY + 5;
          }
          cy += 4;
        });
      }

      // Tour Prices
      const prices: any[] = item.prices || [];
      if (prices.length > 0) {
        sec('Tour Pricing');
        chk(20);
        autoTable(doc, {
          startY: cy, showHead: 'everyPage',
          head: [['Start Date', 'End Date', 'PAX', 'Single (THB)', 'Double (THB)', 'Triple (THB)']],
          body: prices.map((p: any) => [
            sfmt(p.startDate), sfmt(p.endDate),
            p.pax || '-',
            Number(p.singlePrice || 0).toLocaleString(),
            Number(p.doublePrice || 0).toLocaleString(),
            Number(p.triplePrice || 0).toLocaleString()
          ]),
          headStyles: ths, styles: tst, alternateRowStyles: tar,
          margin: { left: m, right: m }
        });
        cy = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    // ── Footer on every page ──────────────────────────────────────────────────
    const np = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= np; i++) {
      doc.setPage(i);
      const fy = ph - 10;
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(m, fy - 4, re, fy - 4);
      doc.setFont('TF', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...LIGHT);
      doc.text('Computer-generated document. | Vera Thailandia Co., Ltd.', pw / 2, fy, { align: 'center' });
      doc.text(`Page ${i} of ${np}  |  ${issueDate}`, re, fy, { align: 'right' });
    }

    const catLabel2 = titleMap[category] || 'Item';
    doc.save(`${catLabel2}_${(item.name || 'export').replace(/\s+/g, '_')}_${item.id || ''}.pdf`);
  }
}
