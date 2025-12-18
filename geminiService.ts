import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserProfile } from "./types";

// Alteração Crítica: Vite usa import.meta.env e exige o prefixo VITE_
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_API_KEY || "" 
});

export const getNutriaResponse = async (userMessage: string, profile: UserProfile | null) => {
  const systemInstruction = `
    Eres 'Nutria', una asistente de IA experta en nutrición y bienestar, específicamente diseñada para el programa 'Truco del Psyllium'.
    Tu tono es acogedor, empoderador, profesional y amable, enfocado en mujeres de 35 a 65 años.
    Información del usuario: ${profile ? JSON.stringify(profile) : 'Desconocida'}.
    Responde siempre en español. Sé concisa pero cálida.
    
    REGLA DE CONVERSACIÓN: No te presentes ni digas "Hola" en cada respuesta si la conversación ya está en curso. Ve directo al grano y responde la duda del usuario de forma útil. Evita introducciones repetitivas.
    
    REGLA DE FORMATO: Si tu respuesta es larga (más de 3 párrafos), divídela mentalmente en partes claras.
    
    Si te preguntan sobre el psyllium, destaca sus beneficios para la salud digestiva y saciedad.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Recomendado: use o nome do modelo estável
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Lo siento, tuve un pequeño problema al procesar tu mensaje. ¿Puedes repetirlo?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ups, parece que mi conexión está un poco lenta. ¡Inténtalo de nuevo!";
  }
};

export const generatePersonalizedRecipe = async (profile: UserProfile, phase: number) => {
  const phaseDurations = ["10 dias", "50 dias (até o dia 60)", "uso contínuo"];
  const currentDuration = phaseDurations[phase - 1];

  const systemInstruction = `
    Você é a Nútria 🦦, a IA oficial da nutricionista Daniele Diniz. 
    Sua missão é gerar a RECEITA PERSONALIZADA do Truque do Psyllium.

    DADOS CRÍTICOS DA PACIENTE:
    - Nome: ${profile.name}
    - Idade: ${profile.age} anos
    - Peso: ${profile.weight}kg
    - Altura: ${profile.height}cm
    - IMC: ${(profile.weight / (Math.pow(profile.height / 100, 2))).toFixed(1)}
    - INTOLERÂNCIAS REGISTRADAS: ${profile.intolerances?.join(', ') || 'Nenhuma'}
    - OUTRAS RESTRIÇÕES: ${profile.otherIntolerance || 'Nenhuma'}

    DIRETRIZES DE FASE:
    - Fase ${phase}: ${phase === 1 ? 'Desinflamação e Controle Glicêmico' : phase === 2 ? 'Aceleração Metabólica' : 'Manutenção e Antirrecidiva'}.
    - DURAÇÃO DA FASE: Você DEVE escrever que esta fase dura exatamente ${currentDuration}.

    REGRAS DE OURO:
    1. USE MUITOS EMOJIS ✨🌿🍎.
    2. RESPEITE RIGOROSAMENTE as intolerâncias. Se ela marcou "Lactose", sugira água ou leite vegetal.
    3. ESCREVA COM CLAREZA por quanto tempo ela deve seguir esta fase: ${currentDuration}.
    4. O preparo deve ser rápido (menos de 30 segundos) ⏱️.
    
    REQUISITO DE FORMATAÇÃO:
    - NÃO use símbolos de markdown como #, ##, ### ou **.
    - NÃO use letras maiúsculas (Caps Lock) para o texto todo ou para títulos longos. Escreva de forma natural, usando maiúsculas apenas no início de frases e nomes próprios.
    - Use quebras de linha duplas para separar seções.
    - Use emojis como marcadores de lista.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: "Nútria, gere meu plano de hoje agora mesmo!",
      config: {
        systemInstruction,
        temperature: 0.6,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating recipe:", error);
    return "Puxa, tive um problema técnico 😰. Por favor, tente novamente!";
  }
};

export const analyzePlate = async (base64Image: string, profile: UserProfile) => {
  const systemInstruction = `
    Eres 'Nutria' 🦦, la experta en nutrición del Truco del Psyllium.
    Tu tarea es analizar la foto de un plato de comida y dar un reporte amable.
    
    DATOS DE LA USUARIA:
    - Edad: ${profile.age}
    - Peso actual: ${profile.weight}kg
    - Meta: ${profile.targetWeight}kg
    
    REGLAS DEL REPORTE:
    1. Identifica los alimentos visibles.
    2. Evalúa si el plato es saludable para el objetivo de pérdida de peso de la usuaria.
    3. Si el plato está bien equilibrado, ¡felicítala! No busques defectos si no los hay.
    4. Si hay algo que mejorar (porciones, exceso de carbohidratos simples, falta de fibra), sugierelo con mucha amabilidad.
    5. Menciona brevemente si el Psyllium ayudaría con este tipo de comida (ej: si es una comida pesada, para reducir el índice glucémico).
    6. Usa un tono femenino, acogedor y motivador.
    7. Formato: Texto limpio, usa emojis, párrafos cortos. No uses Markdown pesado (#, **, etc).
    8. Responde siempre en ESPAÑOL.
  `;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };

  const textPart = {
    text: "Analiza este plato de comida por favor."
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing plate:", error);
    return "Lo siento, no pude analizar la imagen en este momento. Intenta de nuevo con una foto más clara.";
  }
};
