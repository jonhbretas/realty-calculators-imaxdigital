import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { LoanCalculation, CalculationResult, StateCode, MasterAssumptions, LoanProduct } from './types';
import { calculateLoan, DEFAULT_ASSUMPTIONS } from './services/loanService';
import {
  Calculator, Calendar, Phone, TrendingUp, Home, DollarSign, AlertCircle, ShieldCheck,
  CheckCircle, Coffee, ChevronRight, Settings, Info, BookOpen, PieChart as PieChartIcon,
  Briefcase, Scale, Zap, User, MapPin
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CLOSING_COST_DATA = [
  { name: 'Escrow & Title', value: 35, color: '#002855' },
  { name: 'Taxes & Government', value: 25, color: '#F2A900' },
  { name: 'Lender Fees', value: 20, color: '#10b981' },
  { name: 'Prepaids & Insurance', value: 20, color: '#ef4444' },
];

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-[#002855] text-white hover:bg-[#003d82]',
    secondary: 'bg-[#F2A900] text-white hover:bg-[#d99700]',
    outline: 'border-2 border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white',
    ghost: 'text-[#002855] hover:bg-gray-100'
  };
  return (
    <button className={cn('px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50', variants[variant], className)} {...props} />
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-semibold text-black">{label}</label>
    <input className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002855] transition-all" {...props} />
  </div>
);

const formatComma = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return val.toString();
  return num.toLocaleString();
};

const NumericInput = ({ label, value, onChange, className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { label?: string, value: number, onChange: (val: number) => void }) => {
  const [displayValue, setDisplayValue] = useState(formatComma(value));
  
  useEffect(() => {
    setDisplayValue(formatComma(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || raw === '-') {
      setDisplayValue(raw);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      setDisplayValue(formatComma(num));
      onChange(num);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-semibold text-black">{label}</label>}
      <input
        type="text"
        className={cn("px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002855] transition-all text-black", className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
};

const InfoTooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
  <div className="group relative flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 border border-gray-700 font-normal normal-case tracking-normal">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

const Card = ({ children, className, title, onClick }: { children: React.ReactNode; className?: string; title?: string; onClick?: () => void; key?: string | number }) => (
  <div onClick={onClick} className={cn('bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col', className)}>
    {title && (
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-bold text-[#002855]">{title}</h3>
      </div>
    )}
    <div className="p-6 flex-1 flex flex-col">{children}</div>
  </div>
);

function RentVsBuyApp() {
  const [assumptions, setAssumptions] = useState<Record<StateCode, MasterAssumptions>>(DEFAULT_ASSUMPTIONS);
  const [calc, setCalc] = useState<LoanCalculation>({
    monthlyGrossIncome: 15000,
    monthlyExpenses: 2000,
    monthlyRent: 4000,
    propertyValue: 800000,
    downPayment: 160000,
    loanAmount: 640000,
    interestRate: 6.125,
    loanProduct: 'Conventional',
    appreciationRate: 6,
    state: 'WA',
  });

  const [view, setView] = useState<'welcome' | 'calculator' | 'settings' | 'amortization' | 'dpa' | 'guide' | 'matrix' | 'approval' | 'taxSavings' | 'biweekly' | 'realtor'>('welcome');
  const [amortizationView, setAmortizationView] = useState<'monthly' | 'annual'>('annual');
  const [outputView, setOutputView] = useState<'monthly' | 'annual'>('monthly');
  const [matrixPrice, setMatrixPrice] = useState<number>(500000);
  const [matrixDownPct, setMatrixDownPct] = useState<number>(3);
  
  const [taxCalc, setTaxCalc] = useState({
    householdIncome: 100000,
    homePrice: 500000,
    state: 'WA',
    downPayment: 100000,
    interestRate: 6.125,
    appreciationRate: 6,
    filingStatus: 'MFJ' as 'Single' | 'MFJ',
    otherDeductions: 20000,
    oregonEmployer: true,
    remotePercent: 44
  });

  const [biweeklyCalc, setBiweeklyCalc] = useState({
    loanAmount: 450000,
    loanTerm: 30,
    interestRate: 6.125,
    propertyTax: 5625,
    homeownersInsurance: 1200
  });

  const matrixPrices = useMemo(() => {
    const basePrices = [300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 750000, 800000, 850000, 900000, 950000, 1000000];
    if (!basePrices.includes(matrixPrice)) {
      basePrices.push(matrixPrice);
    }
    return basePrices.sort((a, b) => a - b);
  }, [matrixPrice]);

  useEffect(() => {
    const fetchAssumptions = async () => {
      try {
        const q = collection(db, 'assumptions');
        const snapshot = await getDocs(q);
        const fetched: any = { ...DEFAULT_ASSUMPTIONS };
        snapshot.forEach(doc => {
          const data = doc.data();
          const state = doc.id as StateCode;
          fetched[state] = { ...DEFAULT_ASSUMPTIONS[state], ...data };
        });
        setAssumptions(fetched);
      } catch (err) {
        console.error("Error fetching assumptions", err);
      }
    };
    fetchAssumptions();
  }, []);

  useEffect(() => {
    if (assumptions[calc.state]) {
      const rate = assumptions[calc.state].appreciationRate ?? DEFAULT_ASSUMPTIONS[calc.state].appreciationRate;
      setCalc(prev => ({ ...prev, appreciationRate: rate }));
    }
  }, [calc.state, assumptions]);

  const handleUpdateAssumption = async (state: StateCode, field: keyof MasterAssumptions, value: number) => {
    const updated = { ...assumptions[state], [field]: value, updatedAt: serverTimestamp() };
    setAssumptions(prev => ({ ...prev, [state]: updated }));
    try {
      await setDoc(doc(db, 'assumptions', state), updated);
    } catch (err) {
      console.error(err);
    }
  };

  const result = useMemo(() => calculateLoan(calc, assumptions[calc.state]), [calc, assumptions]);

  const matrixResult = useMemo(() => {
    const loanAmount = matrixPrice * (1 - matrixDownPct / 100);
    return calculateLoan({
      ...calc,
      propertyValue: matrixPrice,
      loanAmount: loanAmount,
      interestRate: 6.125,
      loanProduct: 'Conventional',
      downPayment: matrixPrice * (matrixDownPct / 100)
    }, assumptions[calc.state]);
  }, [matrixPrice, matrixDownPct, assumptions, calc.state]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002855] text-white hidden lg:flex flex-col p-6 fixed h-full shadow-2xl overflow-y-auto">
        <div className="mb-8">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 shadow-xl">
            <p className="text-xl font-black text-white mb-1 tracking-tight uppercase leading-tight">Home Loan<br/>Advisor</p>
            <p className="text-sm font-bold text-white uppercase tracking-widest mb-6">Rowan Kardos</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white leading-tight">C2 Financial Corporation</p>
                <p className="text-sm font-medium text-white tracking-wide">NMLS: 2796483</p>
              </div>
              <a href="tel:6507034902" className="flex items-center justify-center gap-2 text-xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all py-4 px-2 rounded-xl active:scale-95 uppercase tracking-tighter whitespace-nowrap">650.703.4902</a>
              <a href="https://www.blink.mortgage/app/signup/p/cfinancialcorporationnorthridgecabranch/rowankardos" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F2A900] text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-[#ffb400] transition-all active:scale-95 shadow-lg">Apply Now</a>
              <p className="text-[10px] text-white text-center font-bold uppercase tracking-widest mt-1">Vancouver, WA</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setView('welcome')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'welcome' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><User size={20} className="shrink-0" /> Welcome</button>
          <button onClick={() => setView('calculator')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'calculator' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><Calculator size={20} className="shrink-0" /> Rent vs Buy Analysis</button>
          <button onClick={() => setView('amortization')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'amortization' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><TrendingUp size={20} className="shrink-0" /> Amortization</button>
          <button onClick={() => setView('matrix')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'matrix' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><PieChartIcon size={20} className="shrink-0" /> Monthly Payment Comparison</button>
          <button onClick={() => setView('taxSavings')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'taxSavings' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><DollarSign size={20} className="shrink-0" /> Estimated Tax Savings</button>
          <button onClick={() => setView('biweekly')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'biweekly' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><Calendar size={20} className="shrink-0" /> Biweekly Payments</button>
          <button onClick={() => setView('dpa')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'dpa' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><Home size={20} className="shrink-0" /> Down Payment Assistance</button>
          <button onClick={() => setView('guide')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'guide' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><BookOpen size={20} className="shrink-0" /> Homebuyer Guide</button>
          <button onClick={() => setView('approval')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'approval' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><ShieldCheck size={20} className="shrink-0" /> PreQual vs PreApproval</button>
          <button onClick={() => setView('settings')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'settings' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><Settings size={20} className="shrink-0" /> Assumptions</button>
          <button onClick={() => setView('realtor')} className={cn("w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg transition-all text-left", view === 'realtor' ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5")}><Briefcase size={20} className="shrink-0" /> Realtor Partnership</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#002855]">
              {view === 'matrix' ? 'Monthly Payment Comparison' : view === 'taxSavings' ? 'Estimated Tax Savings' : view === 'realtor' ? 'Realtor Partnership' : view === 'calculator' ? 'Rent vs Buy Analysis' : view === 'welcome' ? 'Welcome' : ''}
            </h2>
          </div>
          <div className="lg:hidden flex gap-2">
            <select className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium text-[#002855]" value={view} onChange={(e) => setView(e.target.value as any)}>
              <option value="welcome">Welcome</option>
              <option value="calculator">Rent vs Buy Analysis</option>
              <option value="amortization">Amortization</option>
              <option value="matrix">Monthly Payment Comparison</option>
              <option value="taxSavings">Estimated Tax Savings</option>
              <option value="biweekly">Biweekly Payment Calculator</option>
              <option value="dpa">Down Payment Assistance</option>
              <option value="guide">Homebuyer Guide</option>
              <option value="approval">PreQual vs PreApproval</option>
              <option value="settings">Assumptions</option>
              <option value="realtor">Realtor Partnership</option>
            </select>
          </div>
        </header>

        {view === 'welcome' && (
          <div className="max-w-5xl mx-auto py-12 animate-in fade-in duration-700">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-black text-[#002855] mb-6 italic uppercase tracking-tight">Making Your Real Estate<br />Dreams Come True</h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">From buying your first home to expanding your rental portfolio, I am in your corner...</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-full">
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-[#002855] mb-4">Mortgage Consultation</h3>
                  <p className="text-gray-600 mb-8 flex-1">I have a loan program for even the most complicated situations. Schedule a call and go over a customized loan specific to your needs.</p>
                  <a href="https://outlook.office.com/bookwithme/user/..." target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#002855] text-white font-bold rounded-xl hover:bg-[#003d82] transition-colors mt-auto">Schedule Consultation <ChevronRight size={18} /></a>
                </div>
              </Card>
              <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-full">
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-[#002855] mb-4">Application</h3>
                  <div className="space-y-3 mb-8 flex-1 text-gray-600">
                    <p className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Get Preapproved for your mortgage needs.</p>
                    <p className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Sign documents on the go.</p>
                    <p className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Track where your loan is in the process.</p>
                  </div>
                  <a href="https://www.blink.mortgage/..." target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#F2A900] text-black font-black uppercase rounded-xl hover:bg-[#ffb400] transition-colors mt-auto">Start an Application <ChevronRight size={18} /></a>
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === 'calculator' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 space-y-6">
              <Card title="Financial Inputs">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <NumericInput label="Monthly Gross Income" value={calc.monthlyGrossIncome} onChange={val => setCalc({...calc, monthlyGrossIncome: val})} />
                    <NumericInput label="Monthly Expenses" value={calc.monthlyExpenses} onChange={val => setCalc({...calc, monthlyExpenses: val})} />
                  </div>
                  <NumericInput label="Monthly Rent" value={calc.monthlyRent} onChange={val => setCalc({...calc, monthlyRent: val})} />
                  <hr className="my-4" />
                  <NumericInput label="Property Value" value={calc.propertyValue} onChange={val => setCalc({...calc, propertyValue: val})} />
                  <div className="grid grid-cols-2 gap-4">
                    <NumericInput label="Down Payment" value={calc.downPayment} onChange={val => setCalc({...calc, downPayment: val, loanAmount: calc.propertyValue - val})} />
                    <NumericInput label="Loan Amount" value={calc.loanAmount} onChange={val => setCalc({...calc, loanAmount: val, downPayment: calc.propertyValue - val})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <NumericInput label="Interest Rate (%)" value={calc.interestRate} onChange={val => setCalc({...calc, interestRate: val})} />
                      <p className="text-[10px] text-black font-medium">*Approx APR: {(calc.interestRate + (calc.downPayment / calc.propertyValue >= 0.199 ? 0.1 : 0.2)).toFixed(2)}%</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-gray-700">Loan Product</label>
                      <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002855]" value={calc.loanProduct} onChange={e => setCalc({...calc, loanProduct: e.target.value as LoanProduct})}>
                        <option value="Conventional">Conventional</option>
                        <option value="FHA">FHA</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <NumericInput label="Appreciation (%)" value={calc.appreciationRate} onChange={val => setCalc({...calc, appreciationRate: val})} />
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-black">State</label>
                      <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002855]" value={calc.state} onChange={e => setCalc({...calc, state: e.target.value as StateCode})}>
                        <option value="CA">California</option>
                        <option value="OR">Oregon</option>
                        <option value="WA">Washington</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
              <Card title="Loan Metrics">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-black font-bold uppercase mb-1">Debt-to-Income Ratio</p>
                    <p className={cn("text-xl font-bold", result.dti >= 45.1 ? "text-orange-500" : "text-emerald-500")}>{result.dti.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-black font-bold uppercase mb-1">Loan to Value Ratio</p>
                    <p className="text-xl font-bold text-[#002855]">{result.ltv.toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="xl:col-span-2 space-y-8">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-[#002855]">Payment Breakdown</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setOutputView('monthly')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", outputView === 'monthly' ? "bg-white text-[#002855] shadow-sm" : "text-gray-500 hover:text-gray-700")}>Monthly</button>
                  <button onClick={() => setOutputView('annual')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", outputView === 'annual' ? "bg-white text-[#002855] shadow-sm" : "text-black hover:bg-white/50")}>Annual</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-[#002855] text-white">
                  <p className="text-blue-200 text-sm uppercase tracking-wider">{outputView === 'monthly' ? 'Total Monthly Payment' : 'Total Annual'}</p>
                  <p className="text-3xl font-bold">${(outputView === 'monthly' ? result.totalMonthlyPayment : result.totalMonthlyPayment * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </Card>
                <Card>
                  <p className="text-black text-sm uppercase tracking-wider">{outputView === 'monthly' ? 'Monthly Principal' : 'Annual Principal'}</p>
                  <p className="text-2xl font-bold text-emerald-600">${(outputView === 'monthly' ? result.monthlyPrincipal : result.annualAmortizationSchedule[0]?.principal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </Card>
                <Card>
                  <p className="text-black text-sm uppercase tracking-wider">{outputView === 'monthly' ? 'Monthly Interest' : 'Annual Interest'}</p>
                  <p className="text-2xl font-bold text-red-500">${(outputView === 'monthly' ? result.monthlyInterest : result.annualAmortizationSchedule[0]?.interest || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </Card>
              </div>
            </div>
          </div>
        )}

        {view === 'matrix' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Plug in Your Scenario" className="lg:col-span-1">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-black">Purchase Price</label>
                    <NumericInput value={matrixPrice} onChange={(val) => setMatrixPrice(val)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-black">Down Payment %</label>
                    <select value={matrixDownPct} onChange={(e) => setMatrixDownPct(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#002855] outline-none text-black">
                      <option value={3}>3% Down</option>
                      <option value={5}>5% Down</option>
                      <option value={10}>10% Down</option>
                      <option value={20}>20% Down</option>
                    </select>
                  </div>
                  <div className="mt-6 p-6 bg-[#002855] rounded-xl text-center shadow-lg border border-white/10">
                    <p className="text-xs text-white uppercase font-bold tracking-widest mb-2 opacity-80">Principal & Interest</p>
                    <p className="text-6xl font-black text-white tracking-tighter">${Math.round(matrixResult.monthlyPrincipal + matrixResult.monthlyInterest).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="lg:col-span-2 overflow-x-auto p-0 border-none shadow-none bg-transparent">
                <div className="min-w-[500px]">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase bg-[#002855] text-white font-bold">
                        <tr>
                          <th className="px-4 py-4 border-b border-white/10">Price</th>
                          {[3, 5, 10, 20].map(pct => (
                            <th key={pct} className="px-4 py-4 border-b border-white/10 text-center">{pct}% Down</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matrixPrices.map((price) => {
                          const isHighlightedRow = matrixPrice === price;
                          return (
                            <tr key={price} className={cn("transition-colors", isHighlightedRow ? "bg-blue-50/50" : "")}>
                              <td onClick={() => setMatrixPrice(price)} className="px-4 py-3 font-black text-[#002855] border-r border-gray-100 italic cursor-pointer hover:bg-blue-100">${price.toLocaleString()}</td>
                              {[3, 5, 10, 20].map(pct => {
                                const loanAmt = price * (1 - pct / 100);
                                const tempRes = calculateLoan({ ...calc, propertyValue: price, loanAmount: loanAmt, interestRate: 6.125, loanProduct: 'Conventional', downPayment: price * (pct / 100) }, assumptions[calc.state]);
                                const isSelectedCell = isHighlightedRow && matrixDownPct === pct;
                                return (
                                  <td key={pct} onClick={() => { setMatrixPrice(price); setMatrixDownPct(pct); }} className={cn("px-4 py-3 text-center transition-all cursor-pointer", isSelectedCell ? "bg-[#F2A900] text-white font-black scale-105 shadow-md relative z-10" : "text-black font-medium hover:bg-blue-50")}>
                                    ${Math.round(tempRes.monthlyPrincipal + tempRes.monthlyInterest).toLocaleString()}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === 'realtor' && (
          <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700 space-y-20">
            <div className="text-center">
              <div className="inline-block p-4 bg-blue-50 rounded-full text-[#002855] mb-6">
                <TrendingUp size={32} />
              </div>
              <h2 className="text-5xl font-black text-[#002855] tracking-tight mb-2 italic uppercase">Growing Together</h2>
              <p className="text-[#F2A900] font-black uppercase tracking-[0.3em] text-xl">A rising tide raises all boats</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {title: "TBD Underwriting", text: "I can fully underwrite your borrower before they find their dreamhome, preventing surprises and allowing for 10-15 day closes."},
                {title: "24/7 Support", text: "I am available 24/7 to help you and your clients. My team and I are always willing to jump on a call to help with problems."},
                {title: "Marketing Help", text: "We can help with any marketing idea's you want to execute. Whether that's social media, events or something completely new."},
                {title: "Customized Content", text: "I have built templates to help communicate with your buyers. From investment property analysis to loan program comparison pages."},
                {title: "Lead Generation", text: "At the core of it we all need leads. Let us help you generate leads and determine what will work best for you."},
                {title: "Client Retention", text: "Our post closing marketing will continue to put you in front of your clients and keep you top of mind."}
              ].map((item, i) => (
                <Card key={i} className="hover:shadow-xl transition-all duration-300 border-none bg-white p-10">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-[#002855] italic uppercase">{item.title}</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">{item.text}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400 leading-relaxed space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-[#002855] rounded-3xl shadow-2xl border border-white/5">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
              <div>
                <p className="text-2xl font-black text-white tracking-tighter uppercase">Rowan Kardos</p>
                <p className="text-[10px] text-white font-black uppercase tracking-[0.3em]">Home Loan Advisor</p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">C2 Financial Corporation</p>
                <p className="text-sm font-medium text-white tracking-widest">NMLS: 2796483</p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3">
              <a href="tel:6507034902" className="flex items-center gap-3 px-10 py-6 bg-white/5 border border-white/10 text-white rounded-3xl font-black text-3xl md:text-5xl uppercase tracking-tighter hover:bg-white/10 transition-all shadow-xl">650.703.4902</a>
              <p className="text-xs text-white font-bold uppercase tracking-[0.3em] px-2">Vancouver, WA</p>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Contact Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#002855] p-4 flex gap-4 border-t border-white/10 z-50 shadow-2xl">
        <a href="tel:6507034902" className="flex-1 bg-white/10 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black text-lg tracking-tighter whitespace-nowrap">Call</a>
        <a href="https://outlook.office.com/bookwithme/user/..." target="_blank" rel="noreferrer" className="flex-[1.5] bg-[#F2A900] text-[#002855] py-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"><Calendar size={20} /> Book Review</a>
      </div>
    </div>
  );
}

export default function App() {
  return <RentVsBuyApp />;
}