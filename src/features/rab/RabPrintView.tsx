"use client";
import React, { useEffect } from "react";
import { Rab } from "@/types/db";
import { groupSubtotal as calcGroupSubtotal, grandTotal as calcGrandTotal } from "@/utils/rabCalculations";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

interface PrintItem { id: string; spesifikasi: string; qty: number; unit: string; harga: number }
interface PrintGroup { id: string; no: number; deskripsi: string; items: PrintItem[] }

interface Props {
  rab: Rab;
  groups: PrintGroup[];
  onClose: () => void;
}

export default function RabPrintView({ rab, groups, onClose }: Props) {
  const groupSubtotal = (g: PrintGroup) => calcGroupSubtotal(g);
  const grandTotal = calcGrandTotal(groups);
  useEffect(() => {
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  return (
    <div className="hidden print:block print-rab">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 12mm; }
          body * { visibility: hidden; }
          .print-rab, .print-rab * { visibility: visible; }
          .print-rab { position: absolute; top: 0; left: 0; width: 100%; }
          .print-rab table { border-collapse: collapse; width: 100%; font-size: 9pt; }
          .print-rab th, .print-rab td { border: 1px solid #000; padding: 3px 5px; }
          .print-rab .no-border { border: none; }
        }
      `}</style>

      {/* Document Header */}
      <div className="text-center mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">Rencana Anggaran Biaya</h2>
        <h3 className="text-sm font-bold uppercase tracking-wide">{rab.nama}</h3>
      </div>

      <table>
        <thead>
          <tr className="bg-gray-200">
            <th className="text-center w-8">NO</th>
            <th className="text-center w-32">PEKERJAAN</th>
            <th className="text-center">DESKRIPSI</th>
            <th className="text-center w-14">QTY</th>
            <th className="text-center w-10">SAT</th>
            <th className="text-center w-28">HARGA</th>
            <th className="text-center w-28">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              {group.items.map((item, idx) => (
                <tr key={item.id}>
                  {/* No & Deskripsi only on first item row */}
                  {idx === 0 ? (
                    <>
                      <td className="text-center align-top" rowSpan={group.items.length || 1}>
                        {group.no}
                      </td>
                      <td className="align-top font-medium" rowSpan={group.items.length || 1}>
                        {group.deskripsi}
                      </td>
                    </>
                  ) : null}
                  <td>{item.spesifikasi}</td>
                  <td className="text-right">{item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="text-center">{item.unit}</td>
                  <td className="text-right">{formatCurrency(item.harga)}</td>
                  <td className="text-right">{formatCurrency(item.qty * item.harga)}</td>
                </tr>
              ))}
              {/* Subtotal row */}
              <tr>
                <td colSpan={6} className="text-right font-semibold bg-gray-50 pr-2" />
                <td className="text-right font-semibold bg-gray-50">
                  {formatCurrency(groupSubtotal(group))}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          {(rab.diskon_nilai ?? 0) > 0 && (
            <tr>
              <td colSpan={6} className="text-right bg-gray-50">
                Subtotal
              </td>
              <td className="text-right bg-gray-50">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          )}
          {(rab.diskon_nilai ?? 0) > 0 && (
            <tr>
              <td colSpan={6} className="text-right bg-gray-50">
                Diskon {(rab.diskon_persen ?? 0) > 0 ? `(${rab.diskon_persen}%)` : ""}
              </td>
              <td className="text-right bg-gray-50">
                ({formatCurrency(rab.diskon_nilai ?? 0)})
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={6} className="text-center font-bold uppercase tracking-wide bg-gray-100">
              TOTAL
            </td>
            <td className="text-right font-bold bg-gray-100">
              {formatCurrency(grandTotal - (rab.diskon_nilai ?? 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
