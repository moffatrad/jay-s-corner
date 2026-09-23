import { Pipe, PipeTransform } from "@angular/core";

/**
 * Formats a price as Botswana Pula, e.g. "P 549.00".
 * Centralized here so the currency can be changed in one place later.
 */
@Pipe({ name: "jcCurrency", standalone: true })
export class CurrencyPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "P 0.00";
    const num = typeof value === "string" ? Number(value) : value;
    if (Number.isNaN(num)) return "P 0.00";
    return `P ${num.toFixed(2)}`;
  }
}
