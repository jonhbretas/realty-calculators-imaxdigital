import { LoanCalculation, MasterAssumptions, CalculationResult, StateCode } from '../types';

export const DEFAULT_ASSUMPTIONS: Record<StateCode, MasterAssumptions> = {
  WA: { propertyTaxRate: 1.25, insuranceRate: 0.15, closingCostsRate: 3, appreciationRate: 6 },
  OR: { propertyTaxRate: 1.1, insuranceRate: 0.15, closingCostsRate: 3, appreciationRate: 6 },
  CA: { propertyTaxRate: 1.2, insuranceRate: 0.15, closingCostsRate: 2.5, appreciationRate: 5 }
};

export const calculateLoan = (calc: LoanCalculation, assumptions: MasterAssumptions): CalculationResult => {
  const annualRate = calc.interestRate / 100;
  const monthlyRate = annualRate / 12;
  const terms = 360; // 30 anos

  // Cálculo de P&I (Principal e Juros)
  const monthlyPI = (calc.loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -terms));
  
  const monthlyPropertyTax = (calc.propertyValue * (assumptions.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = (calc.propertyValue * (assumptions.insuranceRate / 100)) / 12;
  
  // Estimativa simples de PMI (0.5% anual se LTV > 80%)
  const ltv = (calc.loanAmount / calc.propertyValue) * 100;
  const monthlyPMI = ltv > 80 ? (calc.loanAmount * 0.005) / 12 : 0;

  const totalMonthlyPayment = monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyPMI;
  const dti = ((totalMonthlyPayment + calc.monthlyExpenses) / calc.monthlyGrossIncome) * 100;

  // Projeções simplificadas
  const equityProjections = [1, 3, 5, 10].map(year => ({
    year,
    equity: calc.propertyValue * Math.pow(1 + (calc.appreciationRate / 100), year) - calc.loanAmount,
    totalRentPaid: calc.monthlyRent * 12 * year
  }));

  return {
    dti,
    ltv,
    totalMonthlyPayment,
    monthlyPI,
    monthlyPrincipal: monthlyPI * 0.15, // Estimativa inicial
    monthlyInterest: monthlyPI * 0.85,  // Estimativa inicial
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyPMI,
    monthlyAppreciationAmount: (calc.propertyValue * (calc.appreciationRate / 100)) / 12,
    equityProjections,
    amortizationSchedule: [], // Pode ser preenchido com um loop de 360 meses
    annualAmortizationSchedule: [{ period: 1, principal: monthlyPI * 12 * 0.2, interest: monthlyPI * 12 * 0.8, remainingBalance: calc.loanAmount }]
  };
};