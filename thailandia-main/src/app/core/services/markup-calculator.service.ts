import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MarkupCalculatorService {

  /**
   * คำนวณราคาหลังบวก Markup (สำหรับ Transfer, Excursion, Tour)
   * unit: '%' = เปอร์เซ็นต์, 'flat rate' = บาทคงที่
   */
  applyMarkup(basePrice: number, unit: string | null | undefined, value: number | null | undefined): number {
    const b = Number(basePrice) || 0;
    const v = Number(value) || 0;
    if (unit === 'flat rate' || unit === 'THB') {
      return b + v;
    }
    // Default: percentage
    return b * (1 + v / 100);
  }

  /**
   * คำนวณราคา Hotel ตาม Range-based markup
   * ค้นหา range ที่ basePrice อยู่ใน range นั้น แล้วบวก markup (ตาม unit)
   * หากไม่พบ range ที่ match → ใช้ fallbackValue (hotel_markup_value) แทน
   */
  applyHotelMarkup(
    basePrice: number,
    ranges: any[],
    unit?: string | null,
    fallbackValue?: number | null
  ): number {
    const b = Number(basePrice) || 0;
    const fv = Number(fallbackValue) || 0;
    const isFlat = unit === 'flat rate' || unit === 'THB';

    // ไม่มี ranges เลย → ใช้ fallback โดยตรง
    if (!ranges || ranges.length === 0) {
      if (fv > 0) {
        return isFlat ? b + fv : b * (1 + fv / 100);
      }
      return b;
    }

    // หา range ที่ตรงกับราคา
    const range = ranges.find((r: any) =>
      b >= Number(r.price_from) && b <= Number(r.price_to)
    );

    if (range) {
      // พบ range → ใช้ markup_percentage ของ range นั้น
      const v = Number(range.markup_percentage) || 0;
      return isFlat ? b + v : b * (1 + v / 100);
    }

    // ไม่พบ range ที่ match → ใช้ fallbackValue (Default Hotel Markup)
    if (fv > 0) {
      return isFlat ? b + fv : b * (1 + fv / 100);
    }

    // ไม่มี fallback → คืนราคา raw
    return b;
  }

  /**
   * Round ราคาให้เป็นทศนิยม 2 ตำแหน่ง
   */
  round(price: number): number {
    return Math.round(price * 100) / 100;
  }
}
