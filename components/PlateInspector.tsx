
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, ArrowLeft, Loader2, Sparkles, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import { analyzePlate } from '../geminiService';

interface Props {
  onClose: () => void;
  profile: UserProfile;
}

const PlateInspector: React.FC<Props> = ({ onClose, profile }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera stream on unmount or when camera is closed
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setReport(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    
    const base64Data = image.split(',')[1];
    const result = await analyzePlate(base64Data, profile);
    
    setReport(result || "Hubo un error al generar el reporte.");
    setIsAnalyzing(false);
  };

  const reset = () => {
    setImage(null);
    setReport(null);
    stopCamera();
  };

  // Live Camera UI
  if (isCameraActive) {
    return (
      <div className="fixed inset-0 z-[90] bg-black flex flex-col animate-in fade-in duration-300">
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Camera UI Overlays */}
          <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
            <div className="w-full h-full border-2 border-white/20 rounded-3xl"></div>
          </div>

          <button 
            onClick={stopCamera}
            className="absolute top-6 left-6 p-3 bg-black/40 backdrop-blur-md text-white rounded-2xl active:scale-90 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="h-40 bg-black flex items-center justify-around px-10">
          <div className="w-12 h-12"></div> {/* Spacer */}
          
          <button 
            onClick={takePhoto}
            className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 p-1 active:scale-90 transition-transform"
          >
            <div className="w-full h-full bg-white rounded-full border-2 border-black/10 shadow-inner"></div>
          </button>

          <button 
            className="p-3 text-white/50 active:scale-90 transition-transform"
            onClick={startCamera} // Simple re-trigger/refresh
          >
            <RefreshCw size={24} />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#FDF8F5] flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto pb-10">
      <header className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-md sticky top-0 z-20">
        <button onClick={onClose} className="p-2 bg-pink-50 text-[#E8A2AF] rounded-2xl active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Inspector de Platos 🔍</h2>
      </header>

      <div className="px-6 py-4 flex-1">
        {!image ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-pink-100 rounded-[32px] flex items-center justify-center text-[#E8A2AF] shadow-inner mb-2">
              <Camera size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">¿Qué vas a comer hoy?</h3>
              <p className="text-slate-500 text-sm leading-relaxed px-8">
                Captura una foto de tu plato y deja que <span className="text-[#E8A2AF] font-bold">Nutria</span> analice si está en línea con tu meta.
              </p>
            </div>

            <div className="w-full space-y-3 pt-6">
              <button 
                onClick={startCamera}
                className="w-full bg-[#E8A2AF] text-white py-5 rounded-3xl font-black shadow-xl shadow-pink-100 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                <Camera size={24} /> TOMAR FOTO AHORA
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white text-[#E8A2AF] border-2 border-pink-50 py-5 rounded-3xl font-black active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                <Upload size={24} /> SUBIR DE GALERÍA
              </button>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-4 border-white aspect-square bg-slate-100">
              <img src={image} className="w-full h-full object-cover" alt="Preview" />
              <button 
                onClick={reset}
                className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/60 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!report && !isAnalyzing && (
              <button 
                onClick={triggerAnalysis}
                className="w-full bg-[#E8A2AF] text-white py-6 rounded-[32px] font-black shadow-2xl shadow-pink-200 active:scale-95 transition-all text-xl tracking-widest uppercase flex items-center justify-center gap-3"
              >
                <Sparkles size={24} /> ANALIZAR MI PLATO
              </button>
            )}

            {isAnalyzing && (
              <div className="p-8 bg-white rounded-[32px] border border-pink-50 text-center space-y-4">
                <Loader2 className="animate-spin text-[#E8A2AF] mx-auto" size={40} />
                <h4 className="font-bold text-slate-800">Nutria está escaneando los nutrientes...</h4>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Esto toma unos segundos</p>
              </div>
            )}

            {report && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-pink-100 border border-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 leading-none">Reporte de Nutria</h3>
                      <p className="text-[10px] text-[#E8A2AF] font-bold uppercase tracking-widest mt-1">Análisis de IA en tiempo real</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                    {report}
                  </div>

                  <div className="mt-8 p-5 bg-[#FDF8F5] rounded-3xl border border-pink-100 flex items-start gap-3">
                    <Info className="text-[#E8A2AF] shrink-0" size={20} />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Recuerda que este análisis es informativo. Mantén tu consistencia con el protocolo del Psyllium para maximizar resultados.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={reset}
                  className="w-full mt-6 bg-slate-800 text-white py-5 rounded-[32px] font-black shadow-xl active:scale-95 transition-all text-sm tracking-widest uppercase"
                >
                  ESCANEARE OTRO PLATO
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlateInspector;
