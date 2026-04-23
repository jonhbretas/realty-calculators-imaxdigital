export type StateCode = 'CA' | 'OR' | 'WA';

export type LoanProduct = 'Conventional' | 'FHA';

export interface MasterAssumptions {
  propertyTaxRate: number;
  insuranceRate: number;
  closingCostsRate: number;
  appreciationRate: number;
  updatedBy?: string;
  updatedAt?: any;
}

export interface LoanCalculation {
  monthlyGrossIncome: number;
  monthlyExpenses: number;
  monthlyRent: number;
  propertyValue: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanProduct: LoanProduct;
  appreciationRate: number;
  state: StateCode;
}

export interface CalculationResult {
  dti: number;
  ltv: number;
  totalMonthlyPayment: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthlyPI: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  monthlyAppreciationAmount: number;
  equityProjections: Array<{ year: number; equity: number; totalRentPaid: number }>;
  amortizationSchedule: any[];
  annualAmortizationSchedule: any[];
}