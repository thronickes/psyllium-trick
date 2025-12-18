
import React, { useState, useMemo } from 'react';
import { UserProfile, PhaseContent, WeightEntry } from '../types';
import { MessageCircle, Heart, Search, BookOpen, ChevronRight, User, X, Check, Loader2, Sparkles, ArrowLeft, Clock, Info, Calendar, Target, TrendingDown, Scale, Plus, Calculator } from 'lucide-react';
import NutriaChat from './NutriaChat';
import PlateInspector from './PlateInspector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { generatePersonalizedRecipe } from '../geminiService';

interface Props {
  profile: UserProfile;
}

const PHASES: PhaseContent[] = [
  {
    id: 1,
    title: "Despegue Digestivo",
    dayRange: "Días 1-10",
    description: "Iniciamos con una mezcla suave para despertar el metabolismo.",
    ingredients: ["1 cda Psyllium", "200ml Agua tibia", "Gotas de Limón"],
    instructions: "Mezclar y beber en ayunas, seguido de un vaso de agua pura."
  },
  {
    id: 2,
    title: "Equilibrio Nutritivo",
    dayRange: "Días 11-60",
    description: "Fortalecemos la flora intestinal con prebióticos naturales.",
    ingredients: ["1.5 cda Psyllium", "150ml Jugo Verde", "1 pizca de Jengibre"],
    instructions: "Integrar al jugo verde y consumir 30 min antes del almuerzo."
  },
  {
    id: 3,
    title: "Mantenimiento Vital",
    dayRange: "Día 61+",
    description: "Fase de consolidación para una vida plena y ligera.",
    ingredients: ["1 cda Psyllium", "Yogurt Natural", "Semillas de Chía"],
    instructions: "Mezclar con el yogurt de la tarde como snack saciante."
  }
];

const INTOLERANCE_OPTIONS = [
  "Lactose",
  "Glúten",
  "Frutose",
  "Leguminosas",
  "Corantes e conservantes artificiais",
  "Adoçantes artificiais"
];

const Dashboard: React.FC<Props> = ({ profile }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>(profile.intolerances || []);
  const [otherInput, setOtherInput] = useState(profile.otherIntolerance || '');
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<string | null>(null);
  const [showRecipePage, setShowRecipePage] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const currentDay = useMemo(() => {
    const start = localProfile.startDate;
    const diff = Date.now() - start;
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }, [localProfile.startDate]);

  const currentPhaseIndex = useMemo(() => {
    if (currentDay <= 10) return 1;
    if (currentDay <= 60) return 2;
    return 3;
  }, [currentDay]);

  const currentPhaseData = PHASES[currentPhaseIndex - 1];

  const currentWeight = useMemo(() => {
    if (!localProfile.weightHistory || localProfile.weightHistory.length === 0) return localProfile.weight;
    return localProfile.weightHistory[localProfile.weightHistory.length - 1].weight;
  }, [localProfile.weightHistory, localProfile.weight]);

  const currentBmi = useMemo(() => {
    const h = localProfile.height / 100;
    return currentWeight / (h * h);
  }, [currentWeight, localProfile.height]);

  const weightToGoal = useMemo(() => {
    const target = localProfile.targetWeight;
    if (target) {
      const diff = currentWeight - target;
      return diff > 0 ? diff.toFixed(1) : "0";
    }
    return "0";
  }, [currentWeight, localProfile.targetWeight]);

  const handleRecipeClick = () => {
    if (!localProfile.intolerances || localProfile.intolerances.length === 0) {
      setShowQuiz(true);
    } else {
      setShowRecipePage(true);
      if (!generatedRecipe) {
        handleGenerateRecipe(localProfile);
      }
    }
  };

  const handleGenerateRecipe = async (currentProfile: UserProfile) => {
    setIsGeneratingRecipe(true);
    const startCall = async () => {
      const recipe = await generatePersonalizedRecipe(currentProfile, currentPhaseIndex);
      setGeneratedRecipe(recipe);
    };
    const waitPromise = new Promise(resolve => setTimeout(resolve, 5000));
    await Promise.all([startCall(), waitPromise]);
    setIsGeneratingRecipe(false);
  };

  const toggleIntolerance = (option: string) => {
    setSelectedIntolerances(prev => 
      prev.includes(option) ? prev.filter(i => i !== option) : [...prev, option]
    );
  };

  const saveIntolerances = async () => {
    setIsSavingQuiz(true);
    const updatedProfile: UserProfile = {
      ...localProfile,
      intolerances: selectedIntolerances.length > 0 ? selectedIntolerances : ['Nenhuma'],
      otherIntolerance: otherInput
    };

    try {
      const userRef = doc(db, 'profiles', localProfile.name.toLowerCase().replace(/\s/g, '_'));
      await updateDoc(userRef, {
        intolerances: updatedProfile.intolerances,
        otherIntolerance: updatedProfile.otherIntolerance
      });
      
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setLocalProfile(updatedProfile);
      setShowQuiz(false);
      setShowRecipePage(true);
      handleGenerateRecipe(updatedProfile);
    } catch (error) {
      console.error("Error updating intolerances:", error);
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setLocalProfile(updatedProfile);
      setShowQuiz(false);
      setShowRecipePage(true);
      handleGenerateRecipe(updatedProfile);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!newWeight || isSavingWeight) return;
    setIsSavingWeight(true);
    const weightVal = parseFloat(newWeight);
    const now = Date.now();
    const entry: WeightEntry = { date: now, weight: weightVal };

    const updatedHistory = [...(localProfile.weightHistory || []), entry];
    const updatedProfile: UserProfile = {
      ...localProfile,
      weightHistory: updatedHistory
    };

    try {
      const userRef = doc(db, 'profiles', localProfile.name.toLowerCase().replace(/\s/g, '_'));
      await updateDoc(userRef, {
        weightHistory: arrayUnion(entry)
      });
      
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setLocalProfile(updatedProfile);
      setShowWeightModal(false);
      setNewWeight('');
    } catch (error) {
      console.error("Error updating weight:", error);
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setLocalProfile(updatedProfile);
      setShowWeightModal(false);
      setNewWeight('');
    } finally {
      setIsSavingWeight(false);
    }
  };

  const renderCleanRecipe = (text: string) => {
    const cleanText = text.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '');
    return cleanText.split('\n').map((line, i) => (
      <p key={i} className="mb-2 min-h-[1.2em]">{line}</p>
    ));
  };

  const chartData = useMemo(() => {
    if (!localProfile.weightHistory || localProfile.weightHistory.length === 0) return [];
    return localProfile.weightHistory.map(entry => ({
      timestamp: entry.date,
      displayDate: new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      peso: entry.weight
    }));
  }, [localProfile.weightHistory]);

  if (showRecipePage) {
    const phaseImages = [
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop"
    ];

    return (
      <div className="min-h-screen bg-[#FDF8F5] animate-in slide-in-from-right duration-500 pb-20">
        <header className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-md sticky top-0 z-20">
          <button onClick={() => setShowRecipePage(false)} className="p-2 bg-pink-50 text-[#E8A2AF] rounded-2xl">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Protocolo Nútria 🦦</h2>
        </header>

        {isGeneratingRecipe ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[80vh]">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-pink-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#E8A2AF] rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center animate-bounce">
                <Sparkles className="text-[#E8A2AF]" size={40} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Sua fórmula única está quase pronta...</h3>
            <p className="text-slate-500 text-sm mb-10 px-4 leading-relaxed">
              Respeitando suas intolerâncias e o cronograma da <strong>Fase {currentPhaseIndex}</strong>.
            </p>
            <div className="w-full max-w-xs h-3 bg-white rounded-full overflow-hidden shadow-inner border border-pink-50">
              <div className="h-full bg-gradient-to-r from-[#E8A2AF] to-pink-300 animate-progress-5s shadow-lg shadow-pink-100"></div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-700">
            <div className="h-64 w-full overflow-hidden relative">
              <img src={phaseImages[currentPhaseIndex-1]} className="w-full h-full object-cover" alt="Healthy Food" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FDF8F5] via-transparent to-black/40"></div>
              
              <div className="absolute top-4 left-6 right-6 flex items-center justify-between">
                <span className="bg-[#E8A2AF] text-white px-4 py-2 rounded-full text-[12px] font-black uppercase tracking-widest shadow-2xl border border-white/20">Fase {currentPhaseIndex}</span>
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/40 text-white text-[11px] font-black shadow-lg">
                  <Calendar size={16} /> {currentPhaseIndex === 1 ? '10 dias' : currentPhaseIndex === 2 ? '50 dias' : 'Vitalício'}
                </div>
              </div>
            </div>

            <div className="px-6 -mt-16 relative z-10 pb-10">
              <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-pink-200/40 border border-white">
                
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                    <Target size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sua Meta Personal</p>
                    <p className="text-sm text-slate-700 font-bold leading-tight">
                      Faltam apenas <span className="text-emerald-500 text-lg">{weightToGoal}kg</span> para você atingir seu objetivo de <span className="text-slate-900">{localProfile.targetWeight || '??'}kg</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center shadow-inner">
                    <Sparkles className="text-[#E8A2AF]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">Receita da Nútria</h3>
                    <p className="text-[10px] text-[#E8A2AF] font-bold uppercase tracking-widest mt-1">Exclusiva para {localProfile.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-5 bg-[#FDF8F5] rounded-3xl border border-pink-100/50 shadow-sm mb-6">
                    <Info className="text-[#E8A2AF] shrink-0" size={20} />
                    <div className="text-xs text-slate-500 leading-relaxed italic">
                      Protocolo ajustado para: <span className="text-[#E8A2AF] font-bold">{(localProfile.intolerances || []).join(', ')}</span>.
                    </div>
                  </div>

                  <div className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                    {generatedRecipe ? renderCleanRecipe(generatedRecipe) : "Houve um erro técnico. Tente novamente."}
                  </div>

                  <div className="flex items-center justify-around py-6 border-y border-pink-50 mt-8">
                    <div className="text-center group">
                      <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <Clock size={20} className="text-[#E8A2AF]" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">30 Segundos</span>
                    </div>
                    <div className="text-center group">
                      <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <Calendar size={20} className="text-[#E8A2AF]" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentPhaseIndex === 1 ? '10 Dias' : 'Diário'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRecipePage(false)}
                className="w-full mt-8 bg-[#E8A2AF] text-white py-6 rounded-[32px] font-black shadow-2xl shadow-pink-200 active:scale-95 transition-all text-lg tracking-widest uppercase flex items-center justify-center gap-3"
              >
                ¡VAMOS COM TUDO! 🚀✨
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 animate-in fade-in duration-1000 relative">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bienvenida, {localProfile.name} 👋</h2>
          <p className="text-slate-500 text-sm">Día {currentDay} • {currentPhaseData.title}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-[#E8A2AF] flex items-center justify-center text-white shadow-lg border-2 border-white ring-1 ring-pink-50">
          <User size={24} />
        </div>
      </header>

      <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_-20px_rgba(232,162,175,0.15)] mb-8 border border-pink-50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50/50 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-pink-100/60"></div>
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Tu Evolución</h3>
          <button 
            onClick={() => setShowWeightModal(true)}
            className="bg-[#E8A2AF] text-white p-3 rounded-2xl shadow-lg shadow-pink-100 active:scale-90 transition-transform flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">Registrar Peso</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
          <div className="bg-[#FDF8F5] p-5 rounded-[28px] border border-pink-50 flex items-center gap-4 transition-all hover:shadow-inner">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#E8A2AF] shadow-sm">
              <User size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Edad</p>
              <p className="text-lg font-black text-slate-800 leading-none">{localProfile.age} años</p>
            </div>
          </div>
          <div className="bg-[#FDF8F5] p-5 rounded-[28px] border border-pink-50 flex items-center gap-4 transition-all hover:shadow-inner">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#98D8C8] shadow-sm">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actual</p>
              <p className="text-lg font-black text-slate-800 leading-none">{currentWeight}kg</p>
            </div>
          </div>
          <div className="bg-[#FDF8F5] p-5 rounded-[28px] border border-pink-50 flex items-center gap-4 transition-all hover:shadow-inner">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#C3B1E1] shadow-sm">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IMC</p>
              <p className="text-lg font-black text-slate-800 leading-none">{currentBmi.toFixed(1)}</p>
            </div>
          </div>
          <div className="bg-[#FDF8F5] p-5 rounded-[28px] border border-pink-50 flex items-center gap-4 transition-all hover:shadow-inner">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-400 shadow-sm">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
              <p className="text-lg font-black text-slate-800 leading-none">{localProfile.targetWeight || '--'}kg</p>
            </div>
          </div>
        </div>

        <div className="h-44 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="timestamp" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#cbd5e1'}} 
                dy={10}
                tickFormatter={(ts) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip 
                labelFormatter={(ts) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ stroke: '#E8A2AF', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Line 
                type="monotone" 
                dataKey="peso" 
                stroke="#E8A2AF" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#E8A2AF', stroke: '#fff', strokeWidth: 3 }}
                activeDot={{ r: 8, fill: '#E8A2AF', stroke: '#fff', strokeWidth: 4, shadow: '0 0 10px rgba(232,162,175,0.5)' }}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
          <TrendingDown size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Trayectoria de tu peso</span>
        </div>
      </div>

      {showWeightModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSavingWeight && setShowWeightModal(false)}></div>
          <div className="relative bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Registrar Nuevo Peso</h3>
            <p className="text-slate-500 text-xs mb-8 text-center px-4">¡Cada gramo conta em sua jornada saudável! ✨</p>
            
            <div className="relative mb-8">
              <input 
                autoFocus
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="00.0"
                className="w-full text-center text-4xl font-black py-4 bg-pink-50/30 rounded-3xl border-2 border-pink-50 focus:border-[#E8A2AF] outline-none text-[#E8A2AF] transition-all"
              />
              <span className="absolute bottom-4 right-8 text-slate-400 font-bold uppercase text-[10px]">kg</span>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveWeight}
                disabled={!newWeight || isSavingWeight}
                className="w-full bg-[#E8A2AF] text-white py-5 rounded-3xl font-black shadow-xl shadow-pink-100 active:scale-95 transition-all disabled:opacity-50 text-sm tracking-widest uppercase flex items-center justify-center gap-2"
              >
                {isSavingWeight ? <Loader2 className="animate-spin" size={18} /> : <>Guardar Progreso <Check size={18} strokeWidth={3} /></>}
              </button>
              <button 
                onClick={() => setShowWeightModal(false)}
                disabled={isSavingWeight}
                className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h3 className="text-lg font-bold text-slate-700 mb-4 px-1 text-center sm:text-left uppercase tracking-widest text-xs">Receta del Día</h3>
        <button 
          onClick={handleRecipeClick}
          className="w-full text-left bg-[#E8A2AF]/95 rounded-[40px] p-8 text-white shadow-xl shadow-pink-200/50 relative overflow-hidden active:scale-[0.98] transition-all group border-b-8 border-pink-300"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/20 transition-all"></div>
          
          <span className="inline-block bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black mb-4 uppercase tracking-[0.2em] border border-white/30 backdrop-blur-sm">
            FASE {currentPhaseIndex}: {currentPhaseData.dayRange}
          </span>
          
          <h4 className="text-3xl font-black mb-2 tracking-tight drop-shadow-md uppercase">{currentPhaseData.title}</h4>
          <p className="text-pink-50 text-sm mb-6 leading-relaxed opacity-90 font-medium">{currentPhaseData.description}</p>
          
          <div className="bg-white/10 p-5 rounded-[28px] border border-white/20 backdrop-blur-md mb-4 shadow-inner">
            <h5 className="font-black text-[10px] mb-3 uppercase tracking-widest opacity-80 text-white/90">Base do Psyllium:</h5>
            <ul className="text-sm space-y-2">
              {currentPhaseData.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white shadow-lg"></div> 
                  <span className="font-bold">{ing}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-6 flex justify-center">
            <div className="bg-white text-[#E8A2AF] px-10 py-4 rounded-full text-xs font-black shadow-2xl group-hover:scale-105 group-hover:bg-pink-50 transition-all flex items-center gap-3 uppercase tracking-wider">
              <Sparkles size={18} fill="#E8A2AF" /> GENERAR MI RECETA IA
            </div>
          </div>
        </button>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-bold text-slate-700 mb-4 px-1">Tus Herramientas</h3>
        <div className="grid grid-cols-1 gap-4">
          <button className="flex items-center p-5 bg-white rounded-[24px] shadow-sm border border-pink-50 group active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-[#C3B1E1]/10 flex items-center justify-center text-[#C3B1E1] mr-4">
              <Heart size={22} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 text-sm">Tinder de Alimentos</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-tighter">Mezcla perfecta de sabores</p>
            </div>
            <ChevronRight className="text-slate-200 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => setShowInspector(true)}
            className="flex items-center p-5 bg-white rounded-[24px] shadow-sm border border-pink-50 group active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#98D8C8]/10 flex items-center justify-center text-[#98D8C8] mr-4">
              <Search size={22} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 text-sm">Inspector de Platos</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-tighter">Escanea tu comida con IA</p>
            </div>
            <ChevronRight className="text-slate-200 group-hover:translate-x-1 transition-transform" />
          </button>

          <button className="flex items-center p-5 bg-white rounded-[24px] shadow-sm border border-pink-50 group active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mr-4">
              <BookOpen size={22} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 text-sm">Biblioteca de E-books</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-tighter">Guías premium de saúde</p>
            </div>
            <ChevronRight className="text-slate-200 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {showQuiz && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSavingQuiz && setShowQuiz(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
            <button 
              onClick={() => setShowQuiz(false)} 
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 z-10"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2 mt-2">Personalização</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Diga-nos se você tem alguma intolerância para que a Nútria 🦦 ajuste sua <span className="text-[#E8A2AF] font-bold">fórmula secreta</span>:
            </p>

            <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto px-1 custom-scrollbar">
              {INTOLERANCE_OPTIONS.map((opt) => (
                <button 
                  key={opt}
                  onClick={() => toggleIntolerance(opt)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    selectedIntolerances.includes(opt) 
                      ? 'border-[#E8A2AF] bg-pink-50/30 shadow-inner' 
                      : 'border-slate-100 bg-white hover:border-pink-100'
                  }`}
                >
                  <span className={`text-sm font-bold ${selectedIntolerances.includes(opt) ? 'text-[#E8A2AF]' : 'text-slate-600'}`}>{opt}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    selectedIntolerances.includes(opt) ? 'bg-[#E8A2AF] border-[#E8A2AF] text-white shadow-md' : 'border-slate-100'
                  }`}>
                    {selectedIntolerances.includes(opt) && <Check size={14} strokeWidth={4} />}
                  </div>
                </button>
              ))}

              <div className={`p-4 rounded-2xl border-2 transition-all ${
                selectedIntolerances.includes('Outro') ? 'border-[#E8A2AF] bg-pink-50/30 shadow-inner' : 'border-slate-100 bg-white'
              }`}>
                <button 
                  onClick={() => toggleIntolerance('Outro')}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <span className={`text-sm font-bold ${selectedIntolerances.includes('Outro') ? 'text-[#E8A2AF]' : 'text-slate-600'}`}>Outro</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    selectedIntolerances.includes('Outro') ? 'bg-[#E8A2AF] border-[#E8A2AF] text-white shadow-md' : 'border-slate-100'
                  }`}>
                    {selectedIntolerances.includes('Outro') && <Check size={14} strokeWidth={4} />}
                  </div>
                </button>
                {selectedIntolerances.includes('Outro') && (
                  <input 
                    autoFocus
                    type="text"
                    value={otherInput}
                    onChange={(e) => setOtherInput(e.target.value)}
                    placeholder="Qual sua restrição?"
                    className="w-full bg-white border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#E8A2AF] rounded-xl px-4 py-2 text-sm outline-none transition-all"
                  />
                )}
              </div>
            </div>

            <button 
              onClick={saveIntolerances}
              disabled={isSavingQuiz}
              className="w-full bg-[#E8A2AF] text-white py-5 rounded-3xl font-bold shadow-xl shadow-pink-100 active:scale-95 transition-all disabled:opacity-50 text-lg flex items-center justify-center gap-3"
            >
              {isSavingQuiz ? <Loader2 className="animate-spin" /> : <>AVANÇAR E CRIAR <Sparkles size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {showInspector && <PlateInspector onClose={() => setShowInspector(false)} profile={localProfile} />}

      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#E8A2AF] rounded-full shadow-[0_10px_30px_rgba(232,162,175,0.5)] flex items-center justify-center text-white ring-4 ring-white z-40 active:scale-90 transition-transform"
      >
        <MessageCircle size={32} />
      </button>

      {isChatOpen && <NutriaChat onClose={() => setIsChatOpen(false)} profile={localProfile} />}
    </div>
  );
};

export default Dashboard;
