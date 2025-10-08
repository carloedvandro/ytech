import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    console.log('📸 Processando imagem com Gemini Vision...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Chamar Lovable AI (Gemini Vision)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem que mostra os dados de um dispositivo após digitar *#06#.

EXTRAIA APENAS:
1. EID (32 dígitos alfanuméricos)
2. Todos os IMEIs encontrados (15 dígitos numéricos cada)

Responda APENAS em formato JSON válido (sem markdown, sem explicações):
{
  "eid": "valor_do_eid",
  "imeis": ["imei1", "imei2"]
}

Se houver apenas 1 IMEI, retorne array com 1 elemento.
Se não encontrar algum dado, use null.
IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro Gemini Vision:', response.status, errorText);
      throw new Error(`Erro ao processar imagem: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia do Gemini');
    }

    console.log('🤖 Resposta bruta do Gemini:', content);

    // Tentar extrair JSON da resposta (caso venha com markdown)
    let extractedData;
    try {
      // Remover markdown se houver
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      throw new Error('Não foi possível extrair os dados da imagem');
    }

    const { eid, imeis } = extractedData;

    // Validar dados extraídos
    if (!eid && (!imeis || imeis.length === 0)) {
      throw new Error('Não foi possível extrair dados da imagem. Tente uma imagem mais clara.');
    }

    // Se houver 2 IMEIs, usar o segundo; se 1, usar o único
    const selectedImei = imeis && imeis.length >= 2 ? imeis[1] : imeis?.[0] || null;

    console.log('✅ Dados extraídos:', { eid, imeis, selectedImei });

    return new Response(
      JSON.stringify({
        success: true,
        eid: eid || null,
        imei: selectedImei,
        allImeis: imeis || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
