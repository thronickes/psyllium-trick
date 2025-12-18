
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, Calculator, ArrowRight, ChevronLeft, Target } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    sex: 'Femenino',
    name: '',
    age: undefined,
    height: undefined,
    weight: undefined,
    targetWeight: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [bmi, setBmi] = useState<number>(0);
  const [bmiCategory, setBmiCategory] = useState<{ label: string; color: string }>({ label: '', color: '' });
  const [weightToLose, setWeightToLose] = useState<string>("0");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'age' || name === 'height' || name === 'weight' || name === 'targetWeight') ? Number(value) : value 
    }));
  };

  const getBmiClassification = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Bajo Peso', color: 'bg-amber-400' };
    if (bmiValue < 24.9) return { label: 'Peso Normal', color: 'bg-green-500' };
    if (bmiValue < 29.9) return { label: 'Exceso de Peso', color: 'bg-orange-500' };
    if (bmiValue < 34.9) return { label: 'Obesidad Clase I', color: 'bg-red-500' };
    if (bmiValue < 39.9) return { label: 'Obesidad Clase II', color: 'bg-red-700' };
    return { label: 'Obesidad Mórbida', color: 'bg-red-900' };
  };

  const handleNextStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (step === 1 && formData.name?.trim()) {
      setStep(2);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  const startAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.age || !formData.weight || !formData.height || !formData.targetWeight) return;

    setIsSubmitting(true);
    
    const h = (formData.height || 0) / 100;
    const w = formData.weight || 0;
    const bmiVal = w / (h * h);
    const diff = w - (formData.targetWeight || 0);
    
    setWeightToLose(diff > 0 ? diff.toFixed(1) : "0");
    setBmi(bmiVal);
    setBmiCategory(getBmiClassification(bmiVal));

    setIsAnalyzing(true);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResult(true);
    }, 3000);
  };

  const handleFinalStep = async () => {
    const now = Date.now();
    const fullProfile: UserProfile = {
      name: formData.name || '',
      age: formData.age || 0,
      height: formData.height || 0,
      weight: formData.weight || 0,
      targetWeight: formData.targetWeight || 0,
      sex: (formData.sex as any) || 'Femenino',
      startDate: now,
      weightHistory: [{ date: now, weight: formData.weight || 0 }]
    };

    try {
      const userRef = doc(db, 'profiles', fullProfile.name.toLowerCase().replace(/\s/g, '_'));
      await setDoc(userRef, fullProfile);
      onComplete(fullProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
      onComplete(fullProfile);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 bg-[#FDF8F5] z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-pink-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#E8A2AF] rounded-full border-t-transparent animate-spin"></div>
          <Calculator className="absolute inset-0 m-auto text-[#E8A2AF]" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisando seus Resultados</h2>
        <p className="text-slate-500">Estamos processando sua informação para criar seu plano personalizado.</p>
        <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full mt-8 overflow-hidden shadow-inner">
          <div className="h-full bg-[#E8A2AF] animate-progress-fast shadow-[0_0_10px_rgba(232,162,175,0.5)]"></div>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-pink-50 w-full max-sm:max-w-[95%] text-center animate-in zoom-in duration-500">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">¡Análisis Completo!</h2>
          <p className="text-slate-500 text-xs mb-4">Tu Índice de Masa Corporal es:</p>
          
          <div className="mb-4">
            <span className="text-5xl font-black text-slate-800 tracking-tighter">{bmi.toFixed(1)}</span>
            <span className="text-slate-400 font-medium ml-1 text-sm uppercase">IMC</span>
          </div>

          <div className={`${bmiCategory.color} text-white px-6 py-2.5 rounded-2xl font-bold text-base mb-6 shadow-lg inline-block transform -rotate-1`}>
            {bmiCategory.label}
          </div>

          <div className="bg-pink-50/50 rounded-2xl p-4 mb-6 border border-pink-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#E8A2AF] shadow-sm shrink-0">
              <Target size={20} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-[#E8A2AF] uppercase tracking-widest leading-none mb-1">Tu Meta Personal</p>
              <p className="text-xs text-slate-700 font-bold leading-tight">
                Debes perder <span className="text-[#E8A2AF] text-base">{weightToLose}kg</span> para alcanzar tu meta de <span className="text-slate-900">{formData.targetWeight}kg</span>.
              </p>
            </div>
          </div>

          <div className="text-slate-600 text-xs mb-8 leading-relaxed">
            Basado en tus resultados, hemos preparado un protocolo de <span className="text-[#E8A2AF] font-bold">Psyllium Trick</span> específico para ti.
            <br/><br/>
            <span className="font-bold text-slate-800 text-sm">¿Estás lista para comenzar a bajar de peso?</span>
          </div>

          <button 
            onClick={handleFinalStep}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white py-4 rounded-2xl font-bold shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            ¡Sí, estoy lista! <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen flex flex-col justify-center animate-in fade-in duration-700 bg-[#FDF8F5]">
      <div className="text-center mb-10">
        <div className="flex justify-center gap-2 mb-6">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-12 bg-[#E8A2AF]' : 'w-6 bg-pink-100'}`}></div>
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-12 bg-[#E8A2AF]' : 'w-6 bg-pink-100'}`}></div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          {step === 1 ? '¡Bienvenida!' : 'Casi listo'}
        </h1>
        <p className="text-slate-500">
          {step === 1 ? '¿Cómo debemos llamarte?' : 'Danos algunos detalles más.'}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Tu Nombre</label>
            <input 
              required 
              autoFocus
              type="text" 
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full px-5 py-4 rounded-3xl border-none bg-white shadow-[0_4px_15px_rgba(0,0,0,0.02)] ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all text-lg"
              placeholder="Ej: María García"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#E8A2AF] text-white py-5 rounded-3xl font-bold shadow-lg shadow-pink-100 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
          >
            Continuar <ArrowRight size={20} />
          </button>
        </form>
      ) : (
        <form onSubmit={startAnalysis} className="space-y-4 animate-in slide-in-from-right-8 duration-500">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Edad</label>
              <input 
                required 
                type="number" 
                name="age" 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all" 
                placeholder="00"
              />
            </div>
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sexo</label>
              <select 
                name="sex" 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all appearance-none"
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Prefiero no decir">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Peso (kg)</label>
              <input 
                required 
                type="number" 
                step="0.1" 
                name="weight" 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all" 
                placeholder="00.0"
              />
            </div>
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Altura (cm)</label>
              <input 
                required 
                type="number" 
                name="height" 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all" 
                placeholder="000"
              />
            </div>
          </div>
          
          <div className="relative">
            <label className="block text-[10px] font-bold text-[#E8A2AF] uppercase tracking-widest mb-1.5 ml-1">Sua Meta de Peso (kg) 🎯</label>
            <input 
              required 
              type="number" 
              step="0.1" 
              name="targetWeight" 
              onChange={handleChange} 
              className="w-full px-4 py-3.5 rounded-2xl border-none bg-white shadow-sm ring-1 ring-[#E8A2AF]/30 focus:ring-2 focus:ring-[#E8A2AF] outline-none transition-all font-bold text-slate-700" 
              placeholder="Quanto você quer pesar?"
            />
          </div>
          
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={prevStep} 
              className="p-4 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-[#E8A2AF] text-white py-4 rounded-2xl font-bold shadow-xl shadow-pink-100 active:scale-95 transition-all disabled:opacity-50 text-lg"
            >
              {isSubmitting ? 'Procesando...' : 'Analizar Perfil'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Onboarding;
