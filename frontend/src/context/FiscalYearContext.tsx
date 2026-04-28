import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const FISCAL_YEAR_KEY = 'app.fiscalYear';

interface FiscalYearContextType {
  fiscalYear: number;
  setFiscalYear: (year: number) => void;
  yearOptions: number[];
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYearState] = useState(currentYear);

  useEffect(() => {
    const saved = Number(localStorage.getItem(FISCAL_YEAR_KEY));
    if (Number.isFinite(saved) && saved >= 2000 && saved <= 2100) {
      setFiscalYearState(saved);
    }
  }, []);

  const setFiscalYear = (year: number) => {
    setFiscalYearState(year);
    localStorage.setItem(FISCAL_YEAR_KEY, String(year));
  };

  const yearOptions = useMemo(() => {
    const start = Math.min(currentYear - 2, fiscalYear - 2);
    const end = Math.max(currentYear + 3, fiscalYear + 3);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentYear, fiscalYear]);

  return (
    <FiscalYearContext.Provider value={{ fiscalYear, setFiscalYear, yearOptions }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYear() {
  const context = useContext(FiscalYearContext);
  if (!context) {
    throw new Error('useFiscalYear must be used within FiscalYearProvider');
  }
  return context;
}
